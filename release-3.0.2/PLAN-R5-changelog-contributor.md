# PLAN-R5 — "Contributor: @user" on its own line in the changelog

Raised by the user, 2026-10-22: each changelog entry reads `Thanks [@user]! - <first line>`, and a changeset that starts
with a heading breaks the entry and the GitHub release text taken from it.

## Verified current behaviour

- `.changeset/config.json` uses `["@changesets/changelog-github", { "repo": "DyHex/POMWright" }]`, version 0.7.0
  (`package.json`: `^0.7.0`).
- Its `getReleaseLine` (`dist/changesets-changelog-github.cjs.js`, read 2026-10-22) returns
  `\n\n- [#PR](…) [\`sha\`](…) Thanks [@user](…)! - <first line>\n  <further lines, indented>`. The only option besides
  `repo` that touches this is `disableThanks`, which drops the user entirely. The wording cannot be configured.
- `CHANGELOG.md` line 31 (3.0.0): `… Thanks [@DyHex](…)! - ### Documentation and upgrading`, a heading inline on the
  bullet line, so it does not render as a heading; the same in the 3.0.0 GitHub release.

## Proposal

A changelog module of our own, `scripts/changelog.cjs`, named in `.changeset/config.json` in place of the package
(`["../scripts/changelog.cjs", { "repo": "DyHex/POMWright" }]`, resolved from `.changeset/`). It calls
`@changesets/changelog-github`'s `getReleaseLine` and `getDependencyReleaseLine` as today, and rewrites one part of
each release line:

```text
- [#51](…) [`ec110dc`](…) Contributor: [@DyHex](…)

  Overlapping `seed` calls …
```

The links and the contributor stay on the bullet line; the changeset's text starts on its own line, indented, so a
heading, a list or a code block in it renders as written. An entry without a user (no PR or commit found) gets the same
split without the `Contributor:` part. A line the pattern does not match (a future format of the package) is returned
unchanged.

Prototype, 2026-10-22: the rewrite applied to the 3.0.1 entry and to the 3.0.0 entry that starts with
`### Documentation and upgrading` gives the shape above for both.

## Not changed

`CHANGELOG.md`'s existing entries (`AGENTS.md` section 8: never edited by hand) and the published GitHub release texts.
The 3.0.0 and 3.0.1 release texts can be edited on GitHub by hand if wanted.

## Tests

- The rewrite is a pure function exported from the module; a short `node --test` file
  (`scripts/changelog.test.cjs`) runs it on the 3.0.1 entry, the 3.0.0 heading entry, an entry with two users, one
  without a user, and one without links. It runs in `pnpm test:unit` (added after `vitest run`).
- The end-to-end proof is the next Version Packages pull request: it shows the generated `CHANGELOG.md` before anything
  is published, and 3.0.2's entries are the first to use the module.

## Docs

`AGENTS.md` section 2 (`.changeset/` row, the `scripts/` row) and section 7 (how the changelog is generated).

## Bump

None. No changeset: release tooling, not a change to the package.

## Decided instead (2026-10-22)

The user chose to drop the line rather than reword it: `disableThanks: true` in `.changeset/config.json`, the
package's own option; no custom module. An entry is then `- [#PR](…) [\`sha\`](…) - <first line>`, so a changeset
that starts with a heading still breaks its entry. `AGENTS.md` section 7 now says to start a changeset with a sentence;
the 15 pending changesets all do (checked 2026-10-22).

## Decisions

- [x] `disableThanks: true`, no custom module (2026-10-22)
