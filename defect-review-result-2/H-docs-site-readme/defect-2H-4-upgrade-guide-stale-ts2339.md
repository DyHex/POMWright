# 2H-4: *Upgrading from 2.x* shows `Property 'user' does not exist on type 'string | null'` for a leftover `get<User>`; since f422b77 TypeScript reports `type 'string | { name: string; age: number; } | null'`

- **Kind**: documentation
- **Status**: decided 2026-10-29, decision 101 in [DECISIONS.md](../DECISIONS.md) (the upgrade guide: four fixes and the sentence that a project meets only some items); planned in its own docs plan
- **Area**: *Upgrading from 2.x*, *Session storage → Values are stored as written* (the compile errors a leftover type
  argument gives)
- **Severity**: Low (a compiler message the page tells the reader to expect, copied from 3.0.1's types; a reader who
  searches the page for the error tsc prints does not find it, though the other two lines still match)
- **Semver of the fix**: none (docs only)
- **Pass**: 1
- **First review**: new since 54cdada (f422b77, "storage values typed per key member", changed `get`'s result type
  for a key that is not in the schema; the page's text is from 6f2c87d, 2026-10-20)
- **Reviewed**: `d850405`, 2026-10-28T19:18:27+01:00, Opus 5.5, second review, segment 2H

## Contract

`website/src/content/docs/docs/upgrading-from-2x.md`, lines 579–586:

> A leftover type argument does not point at this item. `set` and `get` still have a type parameter, for the key
> names, so TypeScript reads the old `<User>` as a key and reports, for the 2.x lines above:
>
> ```text
> error TS2353: Object literal may only specify known properties, and 'user' does not exist in type 'EntriesFor<{ user: Codec<{ name: string; age: number; }>; }, User>'.
> error TS2344: Type 'User' does not satisfy the constraint 'string'.
> error TS2339: Property 'user' does not exist on type 'string | null'.
> ```

`website/AGENTS.md`, *Rules*: "Every chain, description and message a page shows is copied from a probe against the
build"; "A change to a message, a rendering or a mechanism greps `website/` for the old text and updates the pages with
it". These three lines are the only compiler messages any page or the README shows (`grep -n "error TS"` over
`website/src/content/docs` and `README.md`), and no check reads them: `check-error-messages.mjs` reads only
*Error messages*, and `check-doc-snippets.mjs` skips the page's `nocheck` 2.x blocks.

## Reproduction

The page's 3.x `AccountPage` (line 557–571) with the page's two 2.x lines (553–554), as one file, compiled against the
packed 3.x package, against 3.0.1 from npm, and against the source at 54cdada, `f422b77~1` and `f422b77` (each extracted
with `git archive`, with `"pomwright"` replaced by `"../index"`):

- probe: `/home/magdys/workspace/dyhex/POMWright-second-review-probes/H/upgrade/v3b/consumer.ts` (tsconfig beside it:
  the root's options, `strict`, `noUncheckedIndexedAccess`, `types: ["node"]`); `node_modules/pomwright` there links
  to the worktree's `.pack/pomwright`, `@playwright` and `@types` to the worktree root's.
- 3.0.1: the same file in `…/H/upgrade/v301b/`, `pomwright` linking to `npm pack pomwright@3.0.1`, extracted.

```sh
T=/home/magdys/workspace/dyhex/POMWright-second-review/node_modules/.bin/tsc   # TypeScript 6.0.3, the root's
U=/home/magdys/workspace/dyhex/POMWright-second-review-probes/H/upgrade
$T -p $U/v3b/tsconfig.json; $T -p $U/v301b/tsconfig.json
for d in src-54cdada src-f422b77_1 src-f422b77; do $T -p $U/$d/tsconfig.json; done
```

Each exits 2 (the errors are the point).

## Observed / expected

```text
# d850405 (.pack/pomwright), and f422b77
error TS2353: Object literal may only specify known properties, and 'user' does not exist in type 'EntriesFor<{ user: Codec<{ name: string; age: number; }>; }, User>'.
error TS2339: Property 'user' does not exist on type 'string | { name: string; age: number; } | null'.
error TS2344: Type 'User' does not satisfy the constraint 'string'.

# 3.0.1, 54cdada, f422b77~1
error TS2353: … (the same)
error TS2339: Property 'user' does not exist on type 'string | null'.
error TS2344: Type 'User' does not satisfy the constraint 'string'.
```

Expected: the page shows what 3.0.2's types report. Two smaller differences: tsc prints the three in source order
(TS2353, TS2339, TS2344), where the page lists TS2344 before TS2339; and the page's sentence "TypeScript reads the old
`<User>` as a key" still holds.

## Cause

f422b77 typed `get`'s result per key member, so a key outside the schema (here the erroneous `User`) is typed as any
of the schema's values; the page's block was not re-read from a probe.

## Fix plan

- Replace line 585 with `error TS2339: Property 'user' does not exist on type 'string | { name: string; age: number; } | null'.`,
  and list the three lines in the order tsc prints them.
- Optional: name the TypeScript version the block was read with (6.0.3), since tsc's wording of these errors is not a
  contract either.
- Tests: none exist for prose messages outside *Error messages*. If the maintainer wants one, `check-doc-snippets.mjs`
  could compile a `// @ts-expect-error` version of these lines, which proves the errors occur but not their text.
- No changeset (docs only).
