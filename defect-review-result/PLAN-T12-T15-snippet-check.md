# Plan 29: the snippet check rejects what it would skip, and compiles the README

- **Decisions**: [DECISIONS.md](DECISIONS.md) #56, #59 (point 1)
- **Findings**: none (test gap #12's snippet part, test gap #15's README part; scope G's planted page
  `…-probes/G/snippets/`)
- **Bump**: none
- **Stop**: no (the script runs locally in `pnpm typecheck`)
- **Depends on**: the README's pending edits of plans 5 (the badge) and earlier; before plan 30 (the docs pass)

## Contract

- `scripts/check-doc-snippets.mjs` fails on a TypeScript block it cannot compile, with a message that names the fix: a
  `~~~` fence (`a TypeScript block in a ~~~ fence is not compiled; write it as a ```ts block`), a `tsx`, `mts` or `cts`
  block (`write the example as a ```ts block`), and `nocheck` anywhere but *Upgrading from 2.x* (`nocheck is only for
  2.x code on Upgrading from 2.x; make the example compile: // ---cut--- hides the setup lines it needs, and //
  @ts-expect-error marks a deliberate compile error`); final wording at implementation. `js`, `sh` and `text` blocks
  stay outside the check.
- The README's `ts` blocks are compiled too, as one more project with the same rules.

## Current behaviour

`scripts/check-doc-snippets.mjs:22,46,66`: the fence pattern matches backticks only, the language must be `ts` or
`typescript`, and `nocheck` blocks are skipped and listed, so a `~~~ts` or `tsx` example, or a failing one marked
`nocheck`, would ship uncompiled (`…-probes/G/snippets/planted.out`); none occur today. The README is not read (AGENTS.md
§9: "compiled by hand when they change").

## Steps

1. The fence pattern also recognises `~~~`; a `~~~` fence labelled `ts`/`typescript`, and a backtick fence labelled
   `tsx`, `mts` or `cts`, is an error with its message (page and line); `nocheck` outside
   `docs/upgrading-from-2x.md` is an error. The script's header comment says what it rejects.
2. The README: read `README.md` as one more page; its two `ts` blocks get `title="orders.page.ts"` and
   `title="orders.spec.ts"` in their fence meta (GitHub and npm show only the language), so the spec block imports
   `./orders.page`; the first-line file-name comments stay for readers. The README is compiled with the example app
   available but not needed.
3. **Tests**: scope G's planted page (a copy in a scratch content directory, via an environment variable or argument
   the script accepts for its content root, or a temporary page removed after) fails with the three messages; the real
   docs and the README stay at 0 problems. Recorded in *Execution notes*.
4. **Docs**: AGENTS.md §9: what the check rejects; the README's examples are compiled by the check ("compiled by hand
   when they change" goes); *Internal → Tests and checks* and *Internal → Documentation*.

## Verify

The standard checks (PLANS.md, rule 5); `pnpm docs:build`.

## Commit

```text
test: the snippet check rejects the blocks it would skip, and compiles the README

A ~~~ fence, a tsx, mts or cts block, and nocheck outside the 2.x upgrade
page now fail the check with the fix in the message, instead of shipping
uncompiled. The README's examples join the check.

Plan: defect-review-result/PLAN-T12-T15-snippet-check.md

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

## Execution notes

(filled in at execution)
