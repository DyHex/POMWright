---
title: pomwright-teach
description: "An agent teaches you POMWright with Playwright: getting started in one sitting, the full course, or one part, with lessons, quizzes and runnable exercises against a practice shop."
---

## What it does

It teaches POMWright with Playwright in a learning workspace of its own: short lessons grounded in these docs and
Playwright's, quizzes, and exercises you run against a practice shop the skill provides. Your progress is kept in
files, so each session continues where the last one ended. You choose the way in:

- **Getting started**: the fundamentals in one sitting (page code, locators and paths, page code and test data in a
  test, queries, shared parts), ending with a course map of what was covered, to what depth, and what is left.
- **The full course**: every part of POMWright, over many sessions, skipping what you already know.
- **A focused track**: one part you name, such as queries, frames, session storage or a refactor of your own tests.

Lessons and exercises are written in the shape of page code you choose (`PageObject` subclasses, your own class,
functions, or fixtures) with the parts of POMWright you want.

## When to use it

It starts only when you run it: `/pomwright-teach` in Claude Code, `$pomwright-teach` in Codex, with what you would like
to learn, for example "page objects with locator paths, for our checkout tests".

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

Three courses run end to end with a teacher agent using the skill and a learner agent, Claude Opus 5.5 at effort high:
two learners who know Playwright and one new to it. 30 lessons in all, from getting started into the full course and a
focused track.

<div class="measured">

| measure | knows Playwright | new to Playwright |
| --- | --- | --- |
| getting started | **5 lessons** | **7 lessons**, 2 on Playwright first |
| agent time to finish it | **19 min** | **37 min** |
| cost to finish it | **$11** | **$13** |
| lessons in all | 11 | 11 |
| every exercise passing at the end | **30 of 30 tests** | **27 of 27 tests** |

</div>

- **Checked before you see it**: every exercise ran green before the learner got it, and the earlier ones were run
  again as the course went on.
- **Fitted to the learner**: Playwright lessons first for a newcomer, plain explanations of TypeScript, the learner's
  own port and editor, their mission and checkout questions carried into later lessons.
- **Grounded**: every POMWright API a lesson uses is looked up in the installed package, and every claim links its
  source.
- **Picks up where you left off**: a fresh session continued a course from the workspace's files alone.
- **Effort high**, as the [index](/POMWright/skills/#using-them-well) recommends.

## Install and source

Install it with `pomwright`, as the [index](/POMWright/skills/#install) shows. Source:
[`skills/pomwright-teach`](https://github.com/DyHex/POMWright/tree/main/skills/pomwright-teach).
