# The curriculum

The order POMWright is learned in, unit by unit. Each unit names the skill it builds, where its knowledge comes from
(the `pomwright` skill's files and the site's pages), and the part of the practice shop its exercises use. A unit is
one to three lessons; skip what the mission and the records say the learner has.

## Contents

- [Before POMWright: Playwright](#before-pomwright-playwright)
- [The units](#the-units)
- [Placing a learner](#placing-a-learner)

## Before POMWright: Playwright

POMWright builds on Playwright and changes none of it. A learner new to Playwright starts with its basics, from
playwright.dev: writing a test, locators and their order of preference, actions and auto-waiting, web-first assertions,
fixtures. The practice shop serves for these exercises too, with `page.getByRole(…)` and no page object yet.

## The units

| unit | the learner can | sources | practice shop |
| --- | --- | --- | --- |
| 1. A first page object | name elements with paths, register them, resolve a chain, navigate | `references/registering.md`, `references/paths-and-registry.md`; *Your first page object* | home: header, newsletter form |
| 2. Choosing locators and paths | pick the locator by Playwright's order, name segments `kind@which`, chain as much as needed | `guides/choosing-locators-and-paths.md`; *Resolving locators* | login form; the "Log in" link and button |
| 3. Page objects in tests | turn page objects into fixtures, write a test as steps, `@step` methods | `references/page-objects.md`, `guides/writing-tests.md`; *Page objects in tests* | home, login |
| 4. Test data | give tests their data through one fixture | `guides/fixtures-and-test-data.md` | login |
| 5. One among several | find a card by its heading, a row by its text, with queries | `references/resolving-and-queries.md`; *Queries* | products, cart |
| 6. Sharing locators | a header module every page uses, a base class with the common locators, reuse by path | `guides/locator-modules.md`, `references/reusing.md` | every page's header and cookie dialog |
| 7. Frames | reach inside an iframe | `references/registering.md` (Frames); *Frames* | payment |
| 8. URLs and navigation | a page whose URL varies, wait for the page a test arrives at | `references/navigation.md` | login to `/account/42` |
| 9. Session storage | declare a codec, read the cart, seed it before the app loads | `references/session-storage.md` | cart |
| 10. Reports | log from a page object with child loggers, configure `@step` | `references/reports.md` | any |
| 11. A project | lay out a suite for one app or several, start it from the templates | `guides/project-structure.md` | the whole shop |
| 12. Review and refactor | review a suite, refactor a messy test into page objects without changing what it checks | `guides/reviewing.md` | a messy spec the lesson provides |
| 13. Mapping a real site | map the learner's own app into page objects | the `pomwright-map-site` skill | the learner's app |

The names in italics are pages of the site's Docs section, which starts at
[Installation](https://dyhex.github.io/POMWright/docs/installation/).

## Placing a learner

Ask what they have written with Playwright and with POMWright, then give a short diagnostic: a page object to read and
explain, and one small exercise from the unit their answer points to. Start one unit before the first one they cannot
do without help, and write a learning record of what they showed.
