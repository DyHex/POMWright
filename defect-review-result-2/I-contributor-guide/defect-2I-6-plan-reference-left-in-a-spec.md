# 2I-6: A spec still cites "the plan's section 1.9" as its contract, a 3.0.0 plan deleted with its working folder, against the rule that no reference to a plan stays outside the folder

- **Kind**: documentation
- **Status**: decided 2026-10-29, decision 109 in [DECISIONS.md](../DECISIONS.md); planned in the contributor guide plan
- **Area**: the contributor guide's release rule 7 against the repository (`docs/releases.md` *Planning*); the comment is in a spec (`test/`)
- **Severity**: Low (a comment points at a contract a reader cannot find; the spec itself is unaffected)
- **Semver of the fix**: none (a comment)
- **Pass**: 1
- **First review**: missed by the first review (present at `54cdada` and at `v3.0.1` in the same file; the 3.0.2 audit, 01d1096, left it)
- **Reviewed**: `d850405`, 2026-10-28 20:04 +0100, Opus 5.5, second review, segment 2I

## Contract

`docs/releases.md` lines 37–40, rule 7: "**Nothing of the folder is kept.** Before the merge, an audit reads every file
of the folder and moves what a later reader needs into the code, its tests, the doc comments, the site (…), the
changesets or the contributor guide, …; no reference to the folder, a plan, a finding or a decision number stays outside
it. Then the folder is deleted."

## Reproduction

From the worktree root:

```sh
git grep -n -I -E "PLAN-|PLANS\.md|DECISIONS|[Dd]ecision (#|[0-9])|the plan's|plan [0-9]|Plan [0-9]|defect-review-result|release-3\.0" -- . ':!defect-review-result' ':!CHANGELOG.md' ':!skills'
```

Output (exit 0): four lines of the guide itself (`docs/releases.md` lines 10, 15, 28 and `src/AGENTS.md` line 43, which
describe the rule) and one other:

```text
test/tests/locatorRegistry/registry/registry.verify.spec.ts:7:// first-segment rule. The table in the plan's section 1.9 is the contract.
```

The comment, lines 5–7:

```ts
// verify() resolves every selector-bearing path once, terminal-only, so every has/hasNot path
// reference goes through the normal resolution, and checks every any-frame path against its
// first-segment rule. The table in the plan's section 1.9 is the contract.
```

`git grep -n "plan's section 1.9" v3.0.1 -- test src` and the same at `54cdada` print the same line of the same file.
`git log -S"plan's section 1.9" -- test` lists `a38a841` (2026-10-13, the 3.0.0 work, "verify() against real DOM"),
`28310c7` and `a7d5ba7` (2026-10-27/28, the packed twins). The 3.0.0 working folder was deleted at `08bdcac`
(`docs/releases.md` line 10). A looser search for "the plan", "decision", "finding" or "the review" in `src`, `test`,
`scripts`, `website/src`, `website/snippets`, the workflows and the README finds no other reference.

## Observed / expected

Observed: a spec names a deleted plan's section as "the contract". Expected (rule 7): the comment names where the
contract lives now: `verify()`'s checks are stated in `src/locators/AGENTS.md` (*Contracts*: "its position is
`verify()`'s first-segment check"; `strictChains`), on *Verifying registries* and on *Internal → Resolution* ("what
`verify()` checks").

## Cause

The 3.0.0 audit kept the comment; the 3.0.2 packed-twin work copied the file's header as it was.

## Fix plan

- Intended contract: no reference to a plan outside a working folder.
- Steps: replace the last sentence of the comment with a link to the page that states the contract, for example "The
  rules are on Verifying registries (website/src/content/docs/docs/verifying-registries.md) and Internal → Resolution."
- Tests: the spec is unchanged; `pnpm lint` (comment only). Optionally a line in rule 7 asking the audit to run the
  `git grep` above, which found this one.
- Changeset: none.
- Area note: the file is 2T's (tests); the rule it breaks is the guide's.
