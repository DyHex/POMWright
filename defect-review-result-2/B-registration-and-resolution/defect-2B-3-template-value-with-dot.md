# 2B-3: a template member's open part "accepts any value", but a value with a dot adds segments, and a registered prefix of it is then chained as an ancestor

- **Kind**: documentation
- **Area**: B-11 typed paths (template members), B-10 path rules, B-22 resolution
- **Severity**: Low (needs a value with a dot whose part before the dot is a registered value too, such as `report` and
  `report.pdf`; the locator then finds nothing, silently until an action or assertion fails)
- **Semver of the fix**: none (docs only)
- **Pass**: 1
- **First review**: new since 54cdada (49454c6, which added the paragraph on open parts, "accepts any value"; at
  `54cdada` *Locator paths* had no such paragraph. The dot-splitting itself is older and the path model.)
- **Reviewed**: `d850405`, 2026-10-28T15:05:36+01:00, Opus 5.5, second review, segment 2B

## Contract

`website/src/content/docs/docs/locator-paths.md`:

- *What a path is* (line 25): "A segment is any text without a dot or whitespace."
- *Paths with a dynamic part* (lines 125-127): "A member with an open part, `` `main.list.item@${string}` ``, accepts any
  value. Only its prefix is offered as a completion, any id compiles, an id that was never registered fails when it is
  resolved, and it has the same search cost."

Nothing says what a value with a dot does: the type accepts it, the runtime path rules accept it, and the dot splits it
into more segments.

## Reproduction

Probe `/home/magdys/workspace/dyhex/POMWright-second-review-probes/B/p04/dotted-value.mjs` (a registry for
`"files" | \`files.link@${string}\``, two links named `report` and `report.pdf`):

```sh
node /home/magdys/workspace/dyhex/POMWright-second-review-probes/B/p04/dotted-value.mjs
```

Exit 0. Output:

```text
report      locator('ul').getByRole('link', { name: 'report', exact: true }) | count: 1
report.pdf  locator('ul').getByRole('link', { name: 'report', exact: true }).getByRole('link', { name: 'report.pdf', exact: true }) | count: 0
strictChains verify: Locator registry verification failed for 1 of 4 paths:
  "files.link@q3.final.pdf": strictChains requires every ancestor to be registered; "files.link@q3" and "files.link@q3.final" are not.
```

## Observed / expected

Observed: `files.link@report.pdf` is the path `files` → `link@report` → `pdf`, so its chain runs through
`files.link@report`'s locator and finds nothing; `verify()` passes. Under `strictChains`, every value with a dot fails
the check. Without a registered prefix (`q3.final.pdf` on a registry without the option) the value resolves as intended,
so the mistake shows only for some values.

Expected: the page that says an open part "accepts any value" also says that a value with a dot is more segments
than one (and that whitespace fails at run time), so a project that fills an open part from data (file names, versions,
emails, amounts) keeps dots out of it.

## Cause

Paths are split at every dot (`src/locators/utils.ts:100-103`, `schemaPathChain`), and a template literal type's
`${string}` admits dots; this is the path model, not a code fault.

## Fix plan

- **Intended contract**: unchanged; the page states it.
- **Options**: (recommended) a sentence in *Paths with a dynamic part*, after "accepts any value": "A value holding a dot
  adds segments: `files.link@report.pdf` is a child of `files.link@report`, whose locator its chain then includes when
  that path is registered too; whitespace fails at run time. Fill an open part with values without dots, or replace the
  dots." A design alternative, typing the open part as a dot-free string or escaping dots at run time, would change
  every path that composes values today: not recommended.
- **Docs**: `docs/locator-paths.md` *Paths with a dynamic part*.
- **Changeset**: none.
