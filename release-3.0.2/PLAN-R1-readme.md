# PLAN-R1 — the README

## Goal

A reader who opens the README, and nothing else, can answer these questions from what it shows, not from what it
claims:

1. What recurring problem does POMWright solve?
2. What does using it look like?
3. How much of it would my project need?
4. What happens when I get it wrong?
5. Can I leave? (Locators stay Playwright `Locator`s.)

It is not a sales pitch, and it stays about the length it is now. The site carries everything else.

## Current README, assessed

- The opening says how it works (paths, chains) before it says why anyone would want that.
- The login example uses every definition once. An experienced Playwright user can write each line without POMWright,
  so the example cannot show what a registry adds. That only shows when the same definitions are used a second time.
- "checks every path right after it is created" can be read as "checks that the locators work". `verify()` checks the
  registry's structure, not the DOM.
- The test ends with `expectAnotherPage()` alone, which shows that the browser left, not where it arrived. The intended
  pairing is the destination page object's `expectThisPage()`.

## Outline

1. One paragraph: what it is, for Playwright Test, locators stay Playwright `Locator`s, Playwright is a peer.
2. One page object with a row registration that two domain methods narrow differently (for example `cancelOrder(n)` and
   `expectStatus(n, status)`). The reuse shows without a sentence about it.
3. The test using it as a fixture, ending with the destination page object's `expectThisPage()`.
4. A `text` block of what you see: the resolved locator described by its path, and the fixture error from a mistyped
   filter path. Both are copied from a probe (`AGENTS.md` section 9).
5. A three-line variation in a test with `getLocatorSchema(…)`, for one use, leaving the registry as it was.
6. A short table of the parts used alone: the registry, `SessionStorage` with `seed`, `log` with `@step`, each with a
   one-line call.
7. One plain sentence on when plain Playwright locators are enough: a suite with few pages and little repetition.
8. Installation, documentation, support, contributing and license, as now. The documentation section keeps the link
   to the 2.x docs at the `v2.1.0` tag and adds the 1.x-to-2.x migration guide at the same tag, for projects still on
   1.x: `https://github.com/DyHex/POMWright/tree/v2.1.0/docs/v1-to-v2-migration` (the folder exists at that tag).

## Constraints

- The examples compile against the packed build, checked by hand (the snippet check reads only the site), and use the
  docs' conventions: `*.example` hosts, descriptive paths, page objects as fixtures.
- Every chain and message shown comes from a probe.
- If the example app in `website/snippets/` lacks the page the README uses, the README may still use it, but the site's
  Getting started link must lead to an example of the same shape.

## Steps

1. Draft in this folder (`README.draft.md`) for review.
2. After approval, replace `README.md`, compile its examples against the packed build, and probe its rendered outputs.
3. Check the site for the same overclaims and fix them in the same commit (the home page, Getting started).

## Bump

None. No changeset: the README ships in the package, but it is not a consumer-facing change of behaviour.

## Decisions

- [x] Outline as above, with the links to the 2.x docs and the 1.x-to-2.x migration guide (2026-10-22)
- [x] The orders page in the example (2026-10-22)
