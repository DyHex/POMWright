# The curriculum

The catalog every course is built from: the units in the order POMWright is learned, what each changes with the
learner's shape, and the three ways in. A learner's own course is `CURRICULUM.md` in the workspace
(`references/workspace.md`), assembled from this catalog, never written from scratch. The sources name the `pomwright`
skill's files and the site's Docs pages (in italics), which start at
[Installation](https://dyhex.github.io/POMWright/docs/installation/).

## Contents

- [Before POMWright: Playwright](#before-pomwright-playwright)
- [The units](#the-units)
- [What changes with the shape](#what-changes-with-the-shape)
- [Getting started](#getting-started)
- [The full course](#the-full-course)
- [A focused track](#a-focused-track)
- [Placing a learner](#placing-a-learner)
- [Building CURRICULUM.md](#building-curriculummd)

## Before POMWright: Playwright

POMWright builds on Playwright and changes none of it. A learner new to Playwright starts with its basics, from
playwright.dev: writing a test, locators and their order of preference, actions and auto-waiting, web-first assertions,
fixtures. The practice shop serves for these exercises too, with `page.getByRole(…)` and no page code yet. Teach as much
as POMWright needs, and link playwright.dev for the rest.

## The units

A unit is one to three lessons. Its *core* is what getting started teaches of it; the full course teaches all of it.

| unit | the learner can | core | sources | practice shop |
| --- | --- | --- | --- | --- |
| 1. First page code | name elements with paths, register them, resolve a chain, reach the page | all | `references/registering.md`, `references/paths-and-registry.md`; *Your first page object* | home: header, newsletter form |
| 2. Choosing locators and paths | pick the locator by the order of preference, name segments `kind@which`, chain as much as needed | the order of preference, `kind@which`, plural and singular | `guides/choosing-locators-and-paths.md`; *Resolving locators* | login form |
| 3. Page code in tests | hand tests their page code as fixtures, write a test as steps | fixtures and a test; a step where the shape has one | `references/page-objects.md`, `guides/writing-tests.md`; *Page objects in tests* | home, login |
| 4. Test data | give tests their data through one fixture | one fixture, read by dot path | `guides/fixtures-and-test-data.md` | login |
| 5. One among several | find a card by its heading, a row by its text, with queries | a query that finds one card, without `nth` | `references/resolving-and-queries.md`; *Queries* | products, cart |
| 6. Sharing locators | a header module every page uses, the common locators registered once, reuse by path | a common module, registered once | `guides/locator-modules.md`, `references/reusing.md` | every page's header and cookie dialog |
| 7. Another shape | write the same locator module in the shapes the learner did not pick, and say when each fits | none | `guides/choosing-a-shape.md`; *Locator paths* (The registry) | products |
| 8. Frames | reach inside an iframe | none | `references/registering.md` (Frames); *Frames* | payment |
| 9. URLs and navigation | a page whose URL varies, wait for the page a test arrives at, `baseURL` beside a page's origin | none | `references/navigation.md` | login to `/account/42` |
| 10. Session storage | declare a codec, read the cart, seed it before the app loads | none | `references/session-storage.md` | cart |
| 11. Reports | log from page code with child loggers, configure `@step` | none | `references/reports.md` | any |
| 12. A project | lay out a suite for one app or several, record its decisions in `POMWRIGHT.md`, start it from the templates | none | `guides/project-structure.md`, `guides/project-decisions.md` | the whole shop |
| 13. Review and refactor | review a suite, refactor a messy test into page code without changing what it checks | none | `guides/reviewing.md` | a messy spec the lesson provides |
| 14. Mapping a real site | map the learner's own app into page code | none | the `pomwright-map-site` skill | the learner's app |

A unit for a part the learner left out of *POMWright's parts* is taught as Playwright's way of doing the same: unit 10
with `page.sessionStorage`, unit 11 with `test.step` and Playwright's `test`, `@step` nowhere.

## What changes with the shape

The shape is the learner's choice (`guides/choosing-a-shape.md`): `PageObject` subclasses (the default), an own class
over a registry, functions, or fixtures only. Paths, locators, queries, reuse and test data are the same in every
shape; five units change:

| unit | `PageObject` subclasses | an own class | functions | fixtures only |
| --- | --- | --- | --- | --- |
| 1 | a subclass with its origin and path, `defineLocators()` | a class whose constructor creates, fills and `verify()`s a registry | a function that does the same and returns the page's actions | a fixture that does the same and hands over the accessors |
| 3 | the page object as a fixture, `@step()` methods | the class as a fixture, `@step()` methods if chosen | the function's result as a fixture, `test.step` | the accessors as a fixture; the test acts on paths |
| 6 | the base class registers the common module | each class's module registers the common module | each function's module does | each fixture's module does |
| 7 | the other three | `PageObject` and the other two | `PageObject` and the other two | `PageObject` and the other two |
| 9 | `navigation.goto()`, `expectThisPage()`, `expectAnotherPage()` | `page.goto(new URL(path, env.shopUrl).href)`, `expect(page).toHaveURL` | the same | the same |

Every exercise is written in the learner's shape and parts (`references/exercises.md`).

## Getting started

The fundamentals in one sitting, about two to three hours for a tester who knows Playwright: five lessons, each with
its exercise, in the learner's shape.

1. **A first page** (units 1 and 2): register paths named `kind@which` with the preferred locators, resolve a chain,
   reach the page.
2. **Page code and test data in a test** (units 3 and 4): the page code as a fixture, data from the test-data fixture,
   a test written as steps (`@step` here if the learner chose it).
3. **One among several** (unit 5): find one card by its name with a query, without `nth`.
4. **Shared parts** (unit 6, its core): the header and `main` in a common module, registered once for every page.
5. **Review and the course map**: questions and one small exercise that mix lessons 1 to 4, then the course map from
   `CURRICULUM.md`: what was covered and to what depth, what was touched only, what was not covered (frames, URLs and
   navigation, session storage, reports, a project, review and refactor, mapping a site), and what to take next: the
   full course from where getting started stopped, or a focused track.

## The full course

Every unit in order, over many sessions, skipping what placement and the records show the learner has; a review lesson
every few lessons and after a break (`SKILL.md`). A learner who did getting started continues at the first unit not
covered in full.

## A focused track

One part the learner names (queries, frames, session storage, a refactor of their tests, a page object for their app
…): find the units it spans, check what the learner can do there with a short diagnostic, then one to four lessons at
the depth the check shows. A track on the learner's own project reads it only, as `SKILL.md` says, and keeps the
exercises in the workspace.

## Placing a learner

Ask what they have written with Playwright and with POMWright, then give a short diagnostic: a page object (in their
shape) to read and explain, and one small exercise from the unit their answer points to. Start one unit before the
first one they cannot do without help, and write a learning record of what they showed.

## Building CURRICULUM.md

1. Take the units of the way in: getting started's five lessons; every unit for the full course; the units a focused
   track spans.
2. Mark what placement and the records show the learner has as *known*, with the evidence's record.
3. Write each unit with its sources from the table above, and the shape's note where the unit has one.
4. Add nothing outside this catalog without saying so in the file; a topic added that way names its sources too, and
   its API is checked as every lesson's is.
5. After each lesson, update the unit's status (planned, covered, partly covered, known) and the depth reached.
