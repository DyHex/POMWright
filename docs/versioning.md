# Versions, bumps and changesets

The supported versions, how a change is versioned, and how a changeset is written. Read it before any consumer-facing
change, which needs a changeset, or before a supported version moves. Part of the contributor guide that
[AGENTS.md](../AGENTS.md) indexes; AGENTS.md's rules apply here too.

## Supported versions

- `@playwright/test` is an exact root dev dependency at the peer floor (1.64.0): the peer floor, the root dev pin and
  the harness pin in `test/package.json` move together, by decision.
- The TypeScript floor (5.0) lives in three places that move together, as the Playwright peer floor and its pins do: the
  README's badge, *Installation*'s sentence under *TypeScript settings*, and the oldest version of
  `scripts/consumer-check.sh`'s loop.

## Changesets

- The published version is `package.json`'s `version`, which changesets sets; the next release is the changesets in
  `.changeset/`. Neither is restated in the contributor guide, so it does not go stale at a release. [release planning](release-planning.md) describes
  how release work is organized.
- Changesets: `pnpm changeset` creates `.changeset/<name>.md`. The `publish.yaml` workflow opens a "Version
  Packages" PR and publishes when it merges. Do not edit `package.json#version` or `CHANGELOG.md` by hand.
- Call out consumer-facing API or behavior changes in the changeset body, with a migration hint whenever something
  a 2.x user wrote stops working.
- Bumps: behavior brought in line with what the docs, the doc comments or the contributor guide already promise is a patch; so
  is a type corrected to what the docs promise and the runtime does, even when code that relied on the wrong type stops
  compiling (its changeset gives the migration). Providing what a released version's docs or doc comments promise but
  the package lacks is a patch too, unless it breaks code written against those docs, which is a major: an export such
  a promise requires is one ([code conventions](code-conventions.md): every public method returns a type a consumer can import; *Types* and
  *TypeScript*: "Every type is imported from `pomwright`"; *Installation*: "Everything is imported from `pomwright`").
  Utility types that only shape parameters (`EntriesFor`, `NonEmpty`, `KeyOnly`, `GotoTarget`) are outside that
  promise. A new export, member, option or accepted input that no such promise requires is a minor; code written
  against the docs that stops compiling for any other reason, or documented behavior removed, is a major.
- The changelog is written by `@changesets/changelog-github` with `disableThanks: true` (`.changeset/config.json`): an
  entry is ``- [#PR](…) [`sha`](…) - <the changeset's first line>``, its further lines indented below. So a changeset
  starts with a sentence, never a heading: a heading on that line does not render, in `CHANGELOG.md` or in the GitHub
  release taken from it (3.0.0's entries show it).
- Pending changesets are the files in `.changeset/` other than `config.json` and `README.md`.
