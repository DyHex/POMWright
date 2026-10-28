# Plan 33: versioning rules: patch-level exports, "Added in" markers

- **Decisions**: [DECISIONS.md](DECISIONS.md) #6, #7
- **Findings**: [F-5](F-packaging-types-changesets/defect-F-5-storage-option-types-bump.md),
  [H-8](H-docs-readme-agents/defect-H-8-no-added-in-markers-for-3-0-2-exports.md) (design questions)
- **Bump**: none (rules, docs and a changeset's wording; the release stays 3.0.2)
- **Stop**: no
- **Depends on**: plans 13 and 15 (their markers are already placed); before plan 41 (the changesets re-read)

## Contract

- AGENTS.md §7's bump rule cites the API reference's promise next to §5's return-type promise: providing what a released
  version's docs or doc comments promise but the package lacks is a patch, unless it breaks code written against those
  docs (a major); utility types that only shape parameters (`EntriesFor`, `NonEmpty`, `KeyOnly`, `GotoTarget`) are
  outside the promise. §5 is unchanged.
- A new export, member or option carries an "Added in" marker, whatever its bump: playwright.dev's `Added in: v3.0.2`, a
  line directly under the item's heading on its API page only; the `api/index.md` rows link there. A fix that makes an
  already-documented form work carries none; the changelog says so.

## Current behaviour

- `.changeset/export-storage-types.md` says the four types are exported "as every other public signature already
  allows", which is untrue (`StepDecorator` and parameter types were not exportable either).
- AGENTS.md §9: "No "Added in" markers on 3.0.0 pages; from the first 3.x addition on, a new member or option carries
  one", which leaves out exports and patch-level additions; `api/class-sessionstorage.md`'s `## AllEntries` (line 263),
  `## Decoded` (314), `## SeedOptions` (339), `## SessionStorageOptions` (349) have none.

## Steps

1. AGENTS.md §7, the *Bumps* bullet: the sentence above, citing `api/types.md` ("Every type is imported from
   `pomwright`"), `docs/typescript.md` and `docs/installation.md`'s promises.
2. AGENTS.md §9: "No "Added in" markers on 3.0.0 pages. From the first 3.x addition on, a new export, member or option
   carries one (`Added in: v3.x.y` under its heading), whatever its bump. A fix that makes an already-documented form
   work carries none; the changelog says so."
3. `api/class-sessionstorage.md`: `Added in: v3.0.2` directly under the four headings; check that `StepDecorator`
   (plan 15) and `ReusableLocatorFactory` (plan 13) have theirs, and that `api/index.md`'s rows link the sections.
4. `.changeset/export-storage-types.md`: "as every other public signature already allows" replaced by the promise it
   fulfils ("the docs say every type is imported from `pomwright`; these four were used in public signatures but not
   exported").
5. *Internal → Documentation*, where it describes page conventions, if it states the marker rule (grep "Added in").

## Verify

The standard checks (PLANS.md, rule 5); `pnpm docs:build`.

## Commit

```text
docs: patch-level exports and their Added in markers

AGENTS.md states that providing what released docs promise is a patch, and
that every new export, member or option carries an "Added in" marker
whatever its bump. The four storage types exported in 3.0.2 get theirs, and
their changeset names the promise it fulfils.

Plan: defect-review-result/PLAN-F-5-H-8-versioning.md

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

## Execution notes

2026-10-28.

- Step 1: AGENTS.md §7, *Bumps*: providing what a released version's docs or doc comments promise but the package lacks
  is a patch unless it breaks code written against them (a major); an export such a promise requires is one, citing
  §5's return-type rule, *Types* and *TypeScript* ("Every type is imported from `pomwright`") and *Installation*
  ("Everything is imported from `pomwright`"); the four
  utility types (`EntriesFor`, `NonEmpty`, `KeyOnly`, `GotoTarget`, each in the declarations) are outside it. A new
  export, member, option or input that no promise requires stays a minor.
- Step 2: AGENTS.md §9, the marker rule as the contract words it, with playwright.dev's form and the index row.
- Step 3: `Added in: v3.0.2` under `## AllEntries`, `## Decoded`, `## SeedOptions` and `## SessionStorageOptions`;
  `StepDecorator` and `ReusableLocatorFactory` had theirs; `api/index.md`'s six rows link the sections. To find any
  other addition without a marker, the public surface of the published 3.0.1 (`npm pack pomwright@3.0.1`) was listed
  beside the build's (exports, their members, the members of option parameters): the only POMWright additions are the
  six exports and their members; the rest of the difference is Playwright's types, which the scratch 3.0.1 could not
  resolve.
- Step 4: `.changeset/export-storage-types.md` names the promise ("The docs say every type is imported from
  `pomwright`; these four were used in public signatures but not exported") and the markers.
- Step 5: no Internal page states the marker rule (grep "Added in"); nothing to change.
- Checks: `pnpm lint` 0; `pnpm test:unit` 900 passed; `pnpm pack-test --reporter=line` exit 0 (2,424 passed, 3
  skipped; doc snippets 223; api coverage 0 problems; error messages 0 problems; step locations 31); `pnpm docs:build` 0.
