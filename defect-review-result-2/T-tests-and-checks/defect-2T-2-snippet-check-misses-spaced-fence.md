# 2T-2: The snippet check neither compiles nor rejects a TypeScript block whose fence has a space before `ts`, which the site renders as TypeScript

- **Kind**: defect
- **Status**: decided 2026-10-29, decision 96 in [DECISIONS.md](../DECISIONS.md) (decided together: 2T-2, 2T-9); planned in the checks plan
- **Area**: documentation checks: `scripts/check-doc-snippets.mjs`
- **Severity**: Low (no such block on the site today; a latent hole in the check's own promise that every TypeScript
  example it cannot compile fails it)
- **Semver of the fix**: none (tooling only)
- **Pass**: 1
- **First review**: missed by the first review (the fence regex at 54cdada is `/^(\s*)(`{3,})(\w*)(.*)$/`, with the
  same `(\w*)`; G planted `~~~ts`, `tsx` and `nocheck`, which ff8a2ac now rejects, not a spaced fence)
- **Reviewed**: `d850405`, 2026-10-28T18:31+01:00, Opus 5.5, second review, segment 2T

## Contract

- `scripts/check-doc-snippets.mjs:15-16`: "A TypeScript example the check could not compile fails it, with the fix: one
  in a ~~~ fence, one labeled tsx, mts or cts, and nocheck on any other page."
- `website/AGENTS.md`, *Rules*: "A TypeScript block the check would not compile, in a `~~~` fence or labeled `tsx`,
  `mts` or `cts`, fails it with the fix."
- `internal/documentation.md:28-31`, *What keeps it true*: "**Nothing is skipped silently.** A TypeScript block the
  check would not compile fails it, with the fix in the message".
- `internal/tests-and-checks.md`, *Type checks* item 5: "every TypeScript example of the documentation and the README,
  compiled against the installed package".

## Reproduction

A mirror of the repository root outside the worktree, holding the script unchanged, the two tsconfigs, the example app,
a README, symlinks to the worktree's `node_modules` and `test/node_modules`, and one page
`website/src/content/docs/docs/probe.md` with three blocks, each assigning a string to a `number`:

````md
```ts
const control: number = "not a number";
```

``` ts
const spaced: number = "not a number";
```

```TS
const upper: number = "not a number";
```
````

Folder: `/home/magdys/workspace/dyhex/POMWright-second-review-probes/T/snippets-mirror/` (setup commands in `log.md`,
18:31). Command:

```sh
cd /home/magdys/workspace/dyhex/POMWright-second-review-probes/T/snippets-mirror && node scripts/check-doc-snippets.mjs
```

exit 1, with one error only:

```text
website/src/content/docs/docs/probe.md:9:7 (test/.doc-snippets/docs/probe/snippet-9.ts): error TS2322: Type 'string' is not assignable to type 'number'.

doc snippets: type errors in 1 checked blocks (tsc reports only syntax errors while any block does not parse)
```

How the site reads the same page: `/home/magdys/workspace/dyhex/POMWright-second-review-probes/T/fence-lang.mjs` parses
it with the site's own `mdast-util-from-markdown` 2.1.0 (what remark uses) and looks the language up in Shiki 4.5.0:

```sh
node /home/magdys/workspace/dyhex/POMWright-second-review-probes/T/fence-lang.mjs /home/magdys/workspace/dyhex/POMWright-second-review /home/magdys/workspace/dyhex/POMWright-second-review-probes/T/snippets-mirror/website/src/content/docs/docs/probe.md
```

exit 0:

```text
line 4: lang="ts" shiki knows it: true, lowercased: true
line 10: lang="ts" shiki knows it: true, lowercased: true
line 16: lang="TS" shiki knows it: false, lowercased: true
```

## Observed / expected

Observed: the `` ``` ts`` block is TypeScript to the site (CommonMark trims the info string, so its language is `ts`),
yet the check counts one block, compiles only the control, and does not list the spaced block as rejected. The `TS`
block is skipped the same way; whether Expressive Code highlights it as TypeScript was not probed (Shiki's table has no
`TS` key), so only the spaced fence is claimed.

Expected: the spaced block is compiled (its error reported at line 15 of the page), or rejected with the fix, as the
check does for `~~~`, `tsx`, `mts` and `cts`.

## Cause

`scripts/check-doc-snippets.mjs:28`: `const fence = /^(\s*)(`{3,}|~{3,})(\w*)(.*)$/;` takes the language only when it
follows the backticks directly, and `blocks()` (line 53) keeps a block only when that capture is one of the TypeScript
labels; the rest of the info string goes to `meta`. A fence that the parser reads as `ts` but the regex reads as an
empty language is dropped before the rejection rules run.

## Fix plan

- **Intended contract**: every block the site renders as TypeScript is compiled or rejected with the fix.
- **Options**:
  1. (recommended) Read the language as CommonMark does: `/^(\s*)(`{3,}|~{3,})\s*([^\s`]*)(.*)$/`, compare it
     lowercased with the TypeScript labels, and reject (with the fix "write it as ```ts") a label that is not exactly
     `ts` or `typescript`. Cost: one regex; no block on the site changes today (`grep` finds no spaced or upper-case
     fence; the fence languages in use are `ts`, `text`, `sh`, `bash`, `html`, `js`, `mermaid`, untitled).
  2. Parse the pages with `mdast-util-from-markdown` from `website/`, as the site does. Cost: the script would depend
     on the site's install, which the harness jobs do not have (`website/AGENTS.md`: the site's dependencies stay out
     of the root).
- **Implementation steps**: `scripts/check-doc-snippets.mjs`, `fence` and `blocks()`.
- **Tests**: the mirror above, run again, reports the spaced block (and the `TS` one, rejected).
- **Docs**: the script's header and `website/AGENTS.md` list the new rejection if option 1 rejects odd labels.
- **Changeset**: none (not consumer-facing).
- **Decisions to tick**: none.
- **Related**: 2T-1 (the other docs check that misses a page-side form).
