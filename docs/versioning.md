# Versions, bumps and changesets

The supported versions, how a change is versioned, and how a changeset is written. Read it before any consumer-facing
change, which needs a changeset, and before a supported version moves. Part of the contributor guide that the root
[AGENTS.md](../AGENTS.md) indexes; its rules apply here too.

## Supported versions

- `@playwright/test` is an exact root dev dependency at the peer floor (1.64.0). The floor moves by decision, in eight
  places together: the peer range in `package.json`, the root dev pin, the harness pin in `test/package.json`, the
  README's requirements line, *Installation*'s list, *Upgrading from 2.x* (its first step and its section on the floor),
  the root `AGENTS.md` (the floor with the reason for each version it needs) and `test/AGENTS.md` (the installed version
  in *Probing* and the harness's pin in *The harness*). Then a `git grep` for the old version finds what is said about
  it elsewhere (a code comment, a page's statement about the browsers it ships), each checked again.
- Node's floor is `package.json#engines` (`>=20`), Playwright's own, and moves when Playwright's does. With it move CI's
  `harness-node` matrix and the `consumer` job's Node step (`checks.yaml`, and the comments of `pr.yaml` and
  `main.yaml`), the README's requirements line, *Installation*'s list, *Upgrading from 2.x*, *Internal → Packaging*,
  *Internal → Tests and checks*, the root `AGENTS.md` and `.github/AGENTS.md`; a `git grep` for the old line finds the
  rest. Before the release, one check stays manual: npm warns `EBADENGINE` when the tarball is installed on a Node below
  the new floor ([.github/AGENTS.md](../.github/AGENTS.md#packaging-probes)).
- The TypeScript floor (5.0) lives in three places that move together, as the Playwright peer floor and its pins do: the
  README's badge, *Installation*'s sentence under *TypeScript settings*, and the oldest version of
  `scripts/consumer-check.sh`'s loop.

## Changesets

- The published version is `package.json`'s `version`, which changesets sets; the next release is the changesets in
  `.changeset/`. Neither is restated in the contributor guide, so it does not go stale at a release. [docs/releases.md](releases.md) describes
  how release work is organized.
- Changesets: `pnpm changeset` creates `.changeset/<name>.md`. The `publish.yaml` workflow opens a "Version
  Packages" PR and publishes when it merges. Do not edit `package.json#version` or `CHANGELOG.md` by hand.
- Call out consumer-facing API or behavior changes in the changeset body, with a migration hint whenever code
  written against the previous release stops working. *Upgrading from 2.x* always describes the upgrade from 2.x to
  the latest 3.x: a change that alters what a 2.x project must do updates that page in the same plan.
- Bumps: behavior brought in line with what the docs, the doc comments or the contributor guide already promise is a patch; so
  is a type corrected to what the docs promise and the runtime does, even when code that relied on the wrong type stops
  compiling (its changeset gives the migration). Providing what a released version's docs or doc comments promise but
  the package lacks is a patch too, unless it breaks code written against those docs, which is a major: an export such
  a promise requires is one ([src/AGENTS.md](../src/AGENTS.md): every public method returns a type a consumer can import; *Types* and
  *TypeScript*: "Every type is imported from `pomwright`"; *Installation*: "Everything is imported from `pomwright`").
  Utility types that only shape parameters (`EntriesFor`, `NonEmpty`, `KeyOnly`, `GotoTarget`) are outside that
  promise. A new export, member, option or accepted input that no such promise requires is a minor; code written
  against the docs that stops compiling for any other reason, or documented behavior removed, is a major.
- The changelog is written by `@changesets/changelog-github` with `disableThanks: true` (`.changeset/config.json`): an
  entry is ``- [#PR](…) [`sha`](…) - <the changeset's first line>``, its further lines indented below. So a changeset
  starts with a sentence, never a heading: a heading on that line does not render, in `CHANGELOG.md` or in the GitHub
  release taken from it (3.0.0's entries show it).
- Pending changesets are the files in `.changeset/` other than `config.json` and `README.md`.
