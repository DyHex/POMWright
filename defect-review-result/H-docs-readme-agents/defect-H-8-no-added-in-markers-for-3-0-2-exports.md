# H-8: Should the "Added in" rule cover exports and accepted inputs added in a patch? The four types first exported in 3.0.2 and `update()`'s `undefined` first argument carry no marker, so the site, which follows `main`, gives a 3.0.1 user no sign they are new

- **Kind**: design question
- **Area**: AGENTS.md §9's "Added in" rule; `api/class-sessionstorage.md`, `api/class-locatorupdatebuilder.md`,
  `api/index.md` (inventory §8)
- **Severity**: Low (a user on 3.0.1 who imports one of the four types gets a "has no exported member" compile error,
  with nothing on the page to say why)
- **Semver of the fix**: none (docs and AGENTS.md only)
- **Reviewed**: `54cdada`, 2026-10-23, H reviewer
- **Status**: decided (2026-10-26, [DECISIONS.md #7](../DECISIONS.md)): a new export, member or option carries an
  "Added in" marker whatever its bump; a fix of an already-documented form carries none

## Contract

AGENTS.md §9: "No "Added in" markers on 3.0.0 pages; from the first 3.x addition on, a new member or option carries
one." Read strictly, the rule names members and options; the four types are new *exports*, classed as a patch by §7
("an export that such a promise requires"), and `update()`'s `undefined` is an accepted input made to compile. So the
code and the site do what the rule says, and this is a question about the rule, not a defect.

§7: the site deploys from `main` after every green `CI` run, so users of every 3.x release read the same site.

## Reproduction

```sh
git diff v3.0.1..54cdada -- index.ts
```

adds `AllEntries`, `Decoded`, `SeedOptions` and `SessionStorageOptions` to the root's exports (`7447754`, changeset
`.changeset/export-storage-types.md`, patch: "They were used in the public signatures but not exported. Each has a
section on the `SessionStorage` API page."). `db26390` (changeset `.changeset/undefined-first-argument.md`, patch)
makes `update().getByRole(role)` with `role: … | undefined` compile.

```sh
grep -rn -i "added in" website/src/content/docs   # prints nothing
```

The four sections, `website/src/content/docs/api/class-sessionstorage.md` lines 263 (`## AllEntries`), 314
(`## Decoded`), 339 (`## SeedOptions`) and 349 (`## SessionStorageOptions`), their rows on `api/index.md` (lines
53–56), and `api/class-locatorupdatebuilder.md` read as if these were always there.

## Argument

The marker exists so that a reader of a site that tracks `main` knows whether the version they have installed has a
feature. A user on 3.0.1 who follows the `SessionStorage` page and writes
`import type { SeedOptions } from "pomwright"` gets a compile error the page does not explain; the same for a
`string | undefined` first argument to `update()`. Whether the addition was a patch or a minor does not change what
the reader needs. Cost: one line per item, and a §9 rule that names exports and accepted inputs.

## Fix plan

- **Intended contract**: §9 says which additions carry a marker.
- **Options**:
  - (recommended) Extend the rule: "a new export, member, option or accepted input carries one, whatever its bump",
    and add "Added in: v3.0.2" (playwright.dev's form) under the four `##` headings and to `update()`'s first
    argument on *LocatorUpdateBuilder*.
  - Keep the rule as it is, and add a sentence to §9 that a patch-level export carries no marker. No page changes.
- **Implementation steps**: AGENTS.md §9; `website/src/content/docs/api/class-sessionstorage.md` (four sections);
  `website/src/content/docs/api/class-locatorupdatebuilder.md`.
- **Tests**: none (`check-api-coverage.mjs` checks headings, which do not change).
- **Docs**: as above.
- **Changeset**: none.
- **Decisions to tick**:
  - [x] does the "Added in" rule cover exports and accepted inputs added in a patch? Exports, members and options: yes,
    whatever their bump. Accepted inputs: no; a fix that makes an already-documented form work (`update()`'s
    `undefined` first argument, and the type fixes of this release) carries no marker, and the changelog says so.
  - [x] if yes, the marker's form: playwright.dev's `Added in: v3.0.2`, a line directly under the item's heading on
    its API page only (the `api/index.md` rows link there). This release: `## AllEntries`, `## Decoded`,
    `## SeedOptions`, `## SessionStorageOptions` on `api/class-sessionstorage.md`, and F-1's and F-2's new types if
    adopted.
  - [x] (added) AGENTS.md §9: "No "Added in" markers on 3.0.0 pages. From the first 3.x addition on, a new export,
    member or option carries one (`Added in: v3.x.y` under its heading), whatever its bump. A fix that makes an
    already-documented form work carries none; the changelog says so."
- **Execution order**: independent.
