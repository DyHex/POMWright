# The learning workspace

The files the learning state lives in, so a new session continues where the last one ended. All paths are relative to
the workspace folder.

## Contents

- [The files](#the-files)
- [MISSION.md](#missionmd)
- [RESOURCES.md](#resourcesmd)
- [Learning records](#learning-records)
- [Lessons and reference sheets](#lessons-and-reference-sheets)

## The files

| path | what it holds |
| --- | --- |
| `MISSION.md` | why the learner is learning POMWright, what success looks like, constraints |
| `RESOURCES.md` | the sources lessons are built from, each with what to use it for |
| `lessons/NNNN-slug.html` | one lesson per file, numbered in the order taught |
| `reference/*.html` | compressed reference sheets: path naming, the ten methods, query recipes, a glossary |
| `exercises/NNNN-slug/` | one exercise per lesson that has one: its starter files and its spec |
| `learning-records/NNNN-slug.md` | what the learner has shown they can do, or already knew |
| `assets/` | the shared stylesheet and the components lessons are built from (a quiz, a code block with a copy button) |
| `practice-app/` | the practice shop, copied from the skill |
| `POMWRIGHT.md` | the workspace's POMWright decisions, from the `pomwright` skill's template with its defaults, which the lessons follow; unit 12 has the learner write one for a project of their own |
| `playwright.config.ts` | runs `exercises/` against the practice shop, which it starts |
| `NOTES.md` | the learner's preferences for how they are taught, and working notes |

## MISSION.md

```text
# Mission: POMWright

## Why
One to three sentences: the concrete outcome (a suite for their app, a review of their team's tests, a migration).

## Success looks like
- A specific thing they will be able to do.

## Starting point
What they know of Playwright and TypeScript, and what they have written with them.

## Constraints and out of scope
Time, the app they will test, what they do not want to learn now.
```

One mission per workspace. Ask until the why is concrete; change it only with the learner, and record the change.

## RESOURCES.md

Start it with the high-trust sources and add only ones that earn a place, each with a line on what to use it for:

- the `pomwright` skill: the rules and the API, by area;
- the POMWright site, `https://dyhex.github.io/POMWright/`: Docs (concepts, in order), API (each method), Internal (how
  it works);
- playwright.dev: Locators, Fixtures, Best practices, Page object models;
- the workspace's `node_modules/pomwright/dist/index.d.ts`: exact signatures and messages;
- the POMWright repository's issues, for questions the docs do not answer, and Playwright's community channels
  listed on playwright.dev, for practice questions beyond POMWright.

## Learning records

`learning-records/NNNN-slug.md`, numbered on: a title and one to three sentences of what is now known and why it
changes what to teach next. Write one only on evidence: an exercise passed and written to the rules, a question
answered with the reason, prior knowledge the learner stated (with its depth), a misconception corrected, a change of
mission. Covering a topic is not learning it. When a later record contradicts an earlier one, mark the earlier one
`Status: superseded by NNNN`.

## Lessons and reference sheets

A lesson is a self-contained HTML file that links the workspace's stylesheet: clean typography, short, one skill, its
code in the form the learner will write it. A reference sheet is the compressed essence a lesson produced, built to
look up and to print. Once a glossary exists, every lesson uses its terms (path, segment, registry, chain, query,
seed, page object, locator module, fixture).
