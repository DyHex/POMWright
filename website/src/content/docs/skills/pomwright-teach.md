---
title: pomwright-teach
description: "An agent teaches you POMWright with Playwright: getting started in one sitting, the full course, or one part, with lessons, quizzes and runnable exercises against a practice shop."
---

## What it does

It teaches POMWright with Playwright in a learning workspace of its own: short lessons grounded in these docs and
Playwright's, quizzes, and exercises you run against a practice shop the skill provides. Your progress is kept in
files, so each session continues where the last one ended. You choose the way in:

- **Getting started**: the fundamentals in one sitting of about two to three hours for a tester who knows Playwright
  (page code, locators and paths, page code and test data in a test, queries, shared parts): five lessons of about 20
  minutes, each with a 10-minute exercise, ending with a course map of what was covered, to what depth, and what is
  left.
- **The full course**: every part of POMWright, over many sessions, skipping what you already know.
- **A focused track**: one part you name, such as queries, frames, session storage or a refactor of your own tests.

Lessons and exercises are written in the shape of page code you choose (`PageObject` subclasses, your own class,
functions, or fixtures) with the parts of POMWright you want.

## When to use it

It starts only when you run it: `/pomwright-teach` in Claude Code, `$pomwright-teach` in Codex, with what you would like
to learn, for example "page objects with locator paths, for checkout tests".

## How it works

1. **The workspace.** The first session asks where to create it (outside your work projects), and asks before installing
   `@playwright/test`, `pomwright` and TypeScript there. It copies in the practice shop: a header, a newsletter form, a
   cookie dialog, product cards, a cart kept in session storage, a payment form in an iframe and a login.
2. **Your mission.** In one message it asks why you want to learn POMWright, what you will build and what you know of
   Playwright and TypeScript, the way in, and your shape and parts, then places you with a short check and writes your
   course into `CURRICULUM.md`.
3. **Every session** reads your mission, course and records, picks the next lesson (or the one you name), writes it
   with a short quiz and links to its sources, and ends with an exercise that you run and see pass.

Every claim in a lesson links its source, every POMWright API it uses is checked against the installed package, and
every example and exercise has been run in the workspace first. A track on your own project reads it only, after you
confirm it is the right folder; the skill asks before reading anything else and says what reading shares.

## What was measured

Three courses run end to end, each by a teacher agent with the skill (Claude Opus 5.5 at effort high, in a workspace of
its own) and a learner at a different level: 30 lessons in all, from getting started into the full course and a focused
track.

<div class="measured">

| | knows POMWright and Playwright | knows Playwright | new to both |
| --- | --- | --- | --- |
| the learner | Claude, which knows POMWright, playing a tester new to it | an agent: a test engineer, Playwright daily for two years | an agent: a manual tester, a little JavaScript |
| getting started | 6 lessons, a review added after a break | **5 lessons** | 7 lessons, 2 on Playwright first |
| the teacher, to the end of getting started | 35 min, **$7.18** | **16 min**, $9.45 | 32 min, $11.14 |
| lessons in all | 8 | **11** | **11** |
| after getting started | frames, a track on logging | frames, session storage, navigation, a review, a team `POMWRIGHT.md` | frames, navigation, a seeded cart, a review |
| tests passing at the end | **all 27** (1 skipped on purpose) | **all 30** | **all 27** |

</div>

- **The first run made the skill better**: it found five faults (a setup without TypeScript, a convention paraphrased
  instead of quoted, a suggestion against the `pomwright` skill's rules, finished exercises rewritten, a harder
  page-module pattern than the `pomwright` template). All five were fixed before the other two runs, and held in both.
- **Checked before you see it**: every exercise ran green before the learner got it, most checked three ways (the
  solution passes, the starter fails, a loose answer fails), and the earlier exercises ran again after each lesson.
- **Fitted to the learner**: Playwright first for the newcomer, TypeScript from zero, another port when the learner's
  was taken, failures shown as the terminal prints them; quiz answers in separate files for the learner who read the
  lessons in an editor.
- **Picks up where you left off**: a fresh session continued the course from the workspace's files alone, and a
  learner's mistake came back in the next quiz in another form.
- **Grounded**: every POMWright API a lesson uses is looked up in the installed package, and every claim links its
  source.
- **Effort high**, as the [index](/POMWright/skills/#using-them-well) recommends.

## Install and source

Install it with `pomwright`, as the [index](/POMWright/skills/#install) shows. Source:
[`skills/pomwright-teach`](https://github.com/DyHex/POMWright/tree/main/skills/pomwright-teach).
