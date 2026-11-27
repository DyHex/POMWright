# Commits

How a commit message is written. Read it before writing one. Part of the contributor guide that the root
[AGENTS.md](../AGENTS.md) indexes; its rules apply here too.

Commit messages follow [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/), summarized below;
where this page says nothing, the specification decides. Nothing reads the format: changesets set the version and write
the changelog ([versioning.md](versioning.md#changesets)), so the type of a commit sets no version. The format is for
contributors and for readers of the history.

## Format

```text
<type>[(scope)][!]: <description>

[body]

[footers]
```

- The description is one short line under 100 characters, without a closing period: what the commit does, or what is
  true after it (`fix(skills): map-site sends nothing over a WebSocket`).
- The body, after a blank line, is a list: one entry per change, or per group of related changes, each as short as it
  can be, so a reader grasps what the commit holds at a glance. Prose paragraphs are not a body; a commit whose
  description says it all has none.
- Footers, after a blank line, are `Token: value` or `Token #value`, with hyphens for spaces in the token
  (`Refs: 676104e`); the `Co-Authored-By:` trailer is one (*Who wrote it*).

```text
docs(guide): follow Conventional Commits 1.0.0

- docs/commits.md: format, types, example scopes, breaking changes, trailer, bot commits
- AGENTS.md: point to it; index row
- docs/repository.md, docs/releases.md: point to it

Co-Authored-By: Claude Opus 5.5
```

## Types

| Type | For |
| --- | --- |
| `feat` | something new for users: an export, an option or a behavior of the package, or a new ability of a skill |
| `fix` | a bug fixed in the package or a skill, security fixes included |
| `docs` | documentation only: the site, the README, doc comments, `SECURITY.md`, the contributor guide |
| `test` | tests and the harness, no runtime change |
| `refactor` | a change that preserves behavior, in commits of its own (the root AGENTS.md, *How to work*) |
| `perf` | the same behavior, faster or lighter |
| `build` | building and packing the package, dependencies, the toolchain |
| `ci` | the workflows, Dependabot's configuration, the scripts only CI runs |
| `chore` | other maintenance: local scripts and checks, working folders |
| `style` | formatting only (biome), nothing else changes; not CSS |
| `revert` | reverting an earlier commit, with a `Refs:` footer naming it |

A commit that fits two types is two commits, wherever it can be split.

A security fix is a `fix`, and its description says what is fixed, not how to exploit it: the fix is public from the
moment its branch is pushed until the advisory is published ([releases.md](releases.md#a-security-fix)).

## Scopes

A scope is optional: a noun, in parentheses, for the part of the repository the commit changes. These are examples,
not the only valid scopes: `locators`, `storage`, `step`, `log`, `navigation`, `skills`, `site`, `guide`, `harness`,
`checks`, `release`, `deps`. Name another part when none of them fits, and leave the scope out when a commit spans
several parts.

## Breaking changes

`!` before the colon marks a breaking change, as the specification defines it: a commit whose changeset is `major`
(`feat(locators)!: <description>`). The changeset holds the migration; a `BREAKING CHANGE:` footer may say what breaks.

A `patch` or `minor` can still break code: one that brings behavior or a declared type in line with what the docs
promised, when code relied on the wrong implementation ([versioning.md](versioning.md#changesets)). Such a commit has no
`!`; a `Possibly-breaking:` footer, before the trailer, gives a grade, what can break and how to update, in the same
words as its changeset's migration hint. Two questions give the grade:

1. Can code written as the docs, the doc comments, the README or the skills show it break, or only code that does
   what they never show, which the types or the runtime accepted?
2. Is the path common (a method, option or input in ordinary use) or an edge case (an empty string, an unusual path,
   calls in an odd order)?

| Who can break | Common path | Edge case |
| --- | --- | --- |
| Documented use | `high` | `medium` |
| Only other use | `medium` | `low` |

```text
fix(storage): <what now matches the docs>

- <the change>

Possibly-breaking: low; <what can break>; <how to update>
Co-Authored-By: Claude Opus 5.5
```

`git log --grep='^Possibly-breaking:'` lists them, and `--grep='^Possibly-breaking: high'` those of one grade.

## Who wrote it

A commit an AI wrote or helped write ends with a `Co-Authored-By:` trailer, a footer naming the model and its version,
without an email address: `Co-Authored-By: Claude Opus 5.5` (the example under *Format*). This holds for every commit
in the repository, not only release work: leaving the trailer out would misstate who wrote the change.

## Commits not written by hand

- Merge commits keep GitHub's message (`Merge pull request #76 from …`), and so does a revert made with GitHub's
  **Revert** button (`Revert "…"`).
- The Version Packages commit is `chore(release): version packages` (`publish.yaml`'s `commit-message`); its pull
  request keeps the title *Version Packages*, which the guide and the site use.
- Dependabot's commits and pull request titles are `ci(deps): …` for the GitHub Actions and `build(deps): …` or
  `build(deps-dev): …` for npm (`.github/dependabot.yml`'s `commit-message`).
