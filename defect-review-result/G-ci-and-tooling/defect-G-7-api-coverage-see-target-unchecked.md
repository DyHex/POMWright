# G-7: The docs say `check-api-coverage.mjs` requires each `@see` to link its own heading; it accepts any `@see`, even one with no link

- **Kind**: documentation
- **Area**: tooling, `scripts/check-api-coverage.mjs`; docs, *Internal → Tests and checks* and *Internal →
  Documentation*
- **Severity**: Low (no `@see` is wrong today; the pages promise a guard that does not exist, so a future wrong link
  passes)
- **Semver of the fix**: none (docs only, or a stricter check script)
- **Reviewed**: `54cdada`, 2026-10-23, reviewer G
- **Status**: decided: the stricter check (2026-10-27, [DECISIONS.md #49](../DECISIONS.md))

## Contract

- `website/src/content/docs/internal/tests-and-checks.md` lines 44-46: `check-api-coverage.mjs` checks that "every
  method and class property [has] a `@see` to its heading".
- `website/src/content/docs/internal/documentation.md` lines 24-27: it "fails on ... a method or class property without
  a `@see` to its heading ... So an editor's hover always links the member's API entry".
- `scripts/check-api-coverage.mjs` line 8: "has a `@see` with its page on the site".
- AGENTS.md §9 states it narrowly and correctly: it fails on "an export, method, class property or constructor without
  a `@see`" and on a site URL "whose page or heading does not exist".

## Reproduction

A copy of the docs and of the installed declarations, with the script run on it:
`/home/magdys/workspace/dyhex/POMWright-final-review-probes/G/apicov/plant.sh` (it restores the copy from the worktree
before every case; output in `plant.out`).

```sh
bash /home/magdys/workspace/dyhex/POMWright-final-review-probes/G/apicov/plant.sh
```

```text
== 2. SessionStorage.get's @see points at the set() heading
     * @see https://dyhex.github.io/POMWright/api/class-sessionstorage/#set
api coverage: 38 exports, 98 members, 122 site links, 0 problems
  => exit 0
== 3. SessionStorage.get's @see names no page at all
     * @see SessionStorage.set
api coverage: 38 exports, 98 members, 122 site links, 0 problems
  => exit 0
== 4. '### get()' demoted to '#### get()' (control: a wrong level is caught)
  no heading: SessionStorage.get (class-sessionstorage.md)
api coverage: 38 exports, 98 members, 123 site links, 1 problems
  => exit 1
```

Today's declarations are right: `/home/magdys/workspace/dyhex/POMWright-final-review-probes/G/apicov/see-scan.mjs`
compares every `@see` of the exports, their members and the two unexported builders with the member's own anchor; the
only differences are the exports that link their page without an anchor and `createReusable`'s factory methods, which
all link `#createreusable` (their only heading). Output in `see-scan.out`.

## Observed / expected

Observed: the script's `hasSee` (line 46) asks only whether a `@see` tag exists; a `@see` pointing at another member's
heading, or naming no URL at all, passes. The URL check (lines 160-174) only asks that a linked page and heading exist.
Expected, by the two Internal pages: a `@see` that is not the member's own heading fails.

A related gap, not a broken promise (the pages say "a heading on it", the page): a member's `### name` is looked up on
the whole page, not in its type's section. On `class-sessionstorage.md`, removing the `### origin` heading of `##
SeedOptions` passes, because `## SessionStorageOptions` has its own `### origin` (case 1 of the same probe: `0
problems`, exit 0).

## Cause

`scripts/check-api-coverage.mjs` line 46 (`hasSee`) and lines 183-196 (one heading set per page).

## Fix plan

- **Intended contract**: either the pages say what the check does, or the check does what the pages say.
- **Options**:
  - **(recommended)** Make the check match the pages: for a method or class property, require a `@see` whose URL is the
    owner's API page with the member's anchor (`slug(member)`, allowing the `-1` suffix of a repeated heading); for an
    export, its page or `#slug(name)`; keep the `createReusable` factory's methods on `#createreusable`. And scope a
    member's heading to its type's `## Name` section on pages with several. `see-scan.mjs` is a starting point; today
    it passes.
  - Correct the two pages to AGENTS.md §9's wording ("a `@see`") and drop "So an editor's hover always links the
    member's API entry".
- **Implementation steps**: `scripts/check-api-coverage.mjs`, or the two pages and the script's header comment.
- **Tests**: the probe's cases 1-3 fail under the stricter script; the worktree's run stays at 0 problems.
- **Docs**: `internal/tests-and-checks.md` "Type checks" item 5, `internal/documentation.md` "What keeps it true",
  AGENTS.md §9 (if the check grows).
- **Changeset**: none.
- **Decisions to tick**:
  - [x] stricter check or corrected pages: **the stricter check**, with the `createReusable` exception
  - [x] heading scope per section ([DECISIONS.md #49](../DECISIONS.md))
- **Execution order**: independent.
