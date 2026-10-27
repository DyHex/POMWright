# H-3: *Upgrading from 2.x*, *How to upgrade*, tells a 2.x project to install 3.0.0, while the page describes 3.0.2's behaviour, and promises a search for every *compiles* item that four items do not give

- **Kind**: documentation
- **Area**: `docs/upgrading-from-2x.md`, *Introduction* and *How to upgrade* (inventory §8, H's own sections)
- **Severity**: Low (a reader who follows step 1 to the letter installs a version without the checks the page goes on
  to describe; the install command a few lines below takes the latest 3.x, so most readers are not misled)
- **Semver of the fix**: none (docs only)
- **Reviewed**: `54cdada`, 2026-10-23, H reviewer
- **Status**: decided (2026-10-27, [DECISIONS.md #46](../DECISIONS.md))

## Contract

- AGENTS.md §9: "The code and its tests decide what the docs say"; a page states a decided contract as decided.
- The page's own *Requirements* block (line 34): `npm install --save-dev @playwright/test@latest pomwright@3`.
- The page's *How to upgrade*, step 3 (lines 17–20): "Search for the changes that still compile but behave
  differently, the items marked **compiles**. Each gives the search, run from the project's root".

## Reproduction

`website/src/content/docs/docs/upgrading-from-2x.md`:

1. Step 1 (line 15): "Upgrade `@playwright/test` to 1.64 or later and `pomwright` to 3.0.0, on Node 20 or later."
   The page then describes behaviour that 3.0.0 does not have. For example, *URLs are checked when a page object is
   constructed* (line 443): a string `urlPath` must "stay on the base's origin once resolved", which `c9c8f34`
   (`fix: a urlPath must stay on its base's origin`, after `v3.0.1`) added; `18634ce`
   (`docs: Upgrading from 2.x states the full urlPath rule`) put it on this page. At `v3.0.0` the check does not exist:
   `git show v3.0.0:src/helpers/url.ts | grep -c "path on the page object's origin"` prints `0`, and at `54cdada`
   `grep -c "path on the page object's origin" src/helpers/url.ts` prints `1`.
2. Step 3 promises a search for each **Compiles** item. Counting the `sh` blocks and inline `grep` commands per item,
   from the worktree root:

   ```sh
   awk '/^### /{if(h!="")print h " | sh=" n " inline-grep=" g " | " m; h=$0; n=0; g=0; getline; while($0==""){getline}; m=substr($0,1,16)} /^```sh/{n++} /`grep -rn/{g++} END{print h " | sh=" n " inline-grep=" g " | " m}' website/src/content/docs/docs/upgrading-from-2x.md | grep -i compiles
   ```

   (output in `/home/magdys/workspace/dyhex/POMWright-final-review-probes/H/upgrade-searches.txt`) gives four
   **Compiles** items without one:
   - *`defineLocators()` runs after the constructor* (line 314)
   - *`pageActionsToPerformAfterNavigation()` is optional* (line 354)
   - *Waits end at the navigation timeout* (line 523)
   - *`get` returns `null` for a missing key* (line 620; a check for `undefined` becomes a check for `null`, with no
     search for the calls)

   The other seven give one, as an `sh` block or an inline `` `grep -rn …` ``.

## Observed / expected

Observed: step 1 names an exact version that predates rules the page states; step 3 says every **compiles** item has a
search, and four do not.

Expected: step 1 names the latest 3.x, as the install command does ("`pomwright` 3, the latest version"); step 3 says
"most give the search", or each of the four gives one (for example `grep -rn 'expectAnotherPage\|expectThisPage'` for
the waits, `grep -rnE '\.get\(' … | grep undefined` for `get`) or says why there is nothing to search ("needs no
change").

## Cause

The *How to upgrade* list was written for 3.0.0 and not revisited when the 3.0.1 and 3.0.2 fixes added rules to the
items below it.

## Fix plan

- **Intended contract**: the page describes the latest 3.x and tells a 2.x project to install it.
- **Options**:
  - (recommended) Step 1: "`pomwright` to the latest 3.x"; step 3: "Most give the search …; the others say what to
    look for." Keep the `title="3.0.0"` labels of the examples (they name the major's API).
  - Add a search to each of the four items. More text for items where the change needs no edit
    (`defineLocators()`, the waits).
- **Implementation steps**: `website/src/content/docs/docs/upgrading-from-2x.md`, lines 15 and 17–20.
- **Tests**: none.
- **Docs**: that page; the README's link text ("every change in 3.0.0 a 2.x project meets") and the page's
  `description` say 3.0.0 too and can stay, since the changes are the major's.
- **Changeset**: none (site only).
- **Decisions to tick**:
  - [x] step 1 names the latest 3.x, and every 3.0.0 on the page that describes 3.x becomes 3.x, the example titles included
  - [x] step 3 no longer promises a search for every **compiles** item (or the four items get one): **the three that need a change get one, the waits item says it needs none** ([DECISIONS.md #46](../DECISIONS.md))
- **Execution order**: with H-1 (same page).
