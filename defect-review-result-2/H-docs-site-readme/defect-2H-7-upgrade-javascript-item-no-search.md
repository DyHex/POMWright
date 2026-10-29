# 2H-7: *Upgrading from 2.x*'s JavaScript item (`describe` and `nth`) asks for a change and gives no search, and does not say it needs none, as step 3 promises every item does

- **Kind**: documentation
- **Status**: decided 2026-10-29, decision 101 in [DECISIONS.md](../DECISIONS.md) (the upgrade guide: four fixes and the sentence that a project meets only some items); planned in its own docs plan
- **Area**: *Upgrading from 2.x*, *How to upgrade* step 3, against the item *From JavaScript: `describe` and `nth`*
- **Severity**: Low (one item of a promise the page makes about all of them; the item is JavaScript-only and its
  `describe` half fails with a message that names the fix, but its `nth` half compiles nowhere and fails silently,
  matching nothing, so it is the half a search would help with)
- **Semver of the fix**: none (docs only)
- **Pass**: 2
- **First review**: H-3: fixed incompletely. H-3 counted the searches of the items marked **Compiles**; its `awk`
  kept the first 16 characters of each item's first line, so this item, whose first line starts "**Fails at run
  time** or **compiles**", never reached its `grep -i compiles` (its `upgrade-searches.txt` lists 11 items, not this
  one). Decision 46 then gave searches to the four items H-3 listed.
- **Reviewed**: `d850405`, 2026-10-28T19:34:28+01:00, Opus 5.5, second review, segment 2H

## Contract

`website/src/content/docs/docs/upgrading-from-2x.md`, *How to upgrade*, step 3 (lines 18–21): "Search for the changes
that still compile but behave differently, the items marked **compiles**. Each item that needs a change gives the
search, run from the project's root; the others say they need none." Decision 46 (2.): "Each item that needs a change
gives the search … the others say they need none."

## Reproduction

The item, lines 306–312:

> **Fails at run time** or **compiles**; TypeScript rejected these calls already. `describe(null)` and
> `describe(undefined)` throw, where 2.x fell back to the path; … `nth(null)` and `nth(undefined)` reach Playwright's
> `nth`, which matches nothing, where 2.x dropped them and matched every element. Call `nth` only when there is an
> index: `if (index !== undefined) query.nth(index)`.

It asks for a change ("Call `nth` only when there is an index") and has no `sh` block, no inline `grep`, and no "needs
no change". H-3's own count, re-run at d850405 with the first-line cut widened to 40 characters so that the marker
shows:

```sh
cd /home/magdys/workspace/dyhex/POMWright-second-review
awk '/^### /{if(h!="")print h " | sh=" n " inline-grep=" g " | " m; h=$0; n=0; g=0; getline; while($0==""){getline}; m=substr($0,1,40)} /^```sh/{n++} /`grep -rn/{g++} END{print h " | sh=" n " inline-grep=" g " | " m}' website/src/content/docs/docs/upgrading-from-2x.md | grep -i compiles
```

Exit 0. Among its lines:

```text
### From JavaScript: `describe` and `nth` | sh=0 inline-grep=0 | **Fails at run time** or **compiles**; T
### `defineLocators()` runs after the constructor | sh=0 inline-grep=0 | **Compiles.** 2.x called `defineLocators
### Waits end at the navigation timeout | sh=0 inline-grep=0 | **Compiles.** In 2.x, `expectThisPage` r
```

The second line's search is in an indented `sh` block inside a list item (line 327), which the `awk` does not count;
the third says "This needs no change" (line 541). The first is the one item with neither.

The item's runtime statement holds: `/home/magdys/workspace/dyhex/POMWright-second-review-probes/H/nthnull/nthnull.mjs`
(`node nthnull.mjs`, exit 0) prints `nth(null): count=0` and `nth(undefined): count=0` for two buttons, and a click on
either times out; the 2.x side (`upgrade/rt2/`) printed the unindexed chain for both.

## Observed / expected

Observed: an item that needs a change gives no search and does not say it needs none. Expected, by step 3: a search,
or a sentence saying why none is given.

## Cause

H-3's count dropped the item (above); decision 46 fixed the items H-3 listed.

## Fix plan

- Recommended: give the item a search for JavaScript files, the only place it applies, for the calls whose argument may
  be `undefined` or `null`: `grep -rnE '\.(nth|describe)\(' --include=*.js --include=*.mjs --include=*.cjs --exclude-dir=node_modules .`,
  with "review each call whose argument can be `null` or `undefined`".
- Alternative: say plainly that no search can find a variable that may be `undefined`, so the item needs a review of
  the JavaScript code that calls `nth` and `describe` with a variable.
- Tests: none. No changeset (docs only).
