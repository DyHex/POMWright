---
name: pomwright-teach
description: >-
  Teaches POMWright with Playwright in a learning workspace of its own: a getting-started course for one sitting, the
  full course over many sessions, or a focused track on one part, in the shape of page code the learner chooses. Short
  lessons grounded in the POMWright and Playwright documentation, quizzes, and runnable exercises against a practice
  shop the skill provides, with progress kept in files so each session continues where the last one ended. Run it when
  the user asks to learn POMWright.
license: Apache-2.0
compatibility: POMWright 3.x, @playwright/test >=1.64.0 <2.0.0, Node 20 or later; a local folder for the workspace.
disable-model-invocation: true
argument-hint: "What would you like to learn about POMWright?"
---

# Teach POMWright

The user has asked to learn POMWright, all of it or one part. Keep the learning's state in a learning workspace, teach
one small thing per lesson, and make every lesson end in something the learner did and saw pass.

## Teach from sources, never from memory

- **What POMWright does and how it is used**: the `pomwright` skill (use it by name) and the pages it links on
  [dyhex.github.io/POMWright](https://dyhex.github.io/POMWright/docs/installation/); exact signatures and messages from
  the workspace's installed declarations, `node_modules/pomwright/dist/index.d.ts`.
- **What Playwright does**: playwright.dev.
- A convention a lesson teaches (how a segment is named, the shape of page code, where a check lives) is quoted from
  the workspace's `POMWRIGHT.md`, not paraphrased, so the lesson says exactly what the file decides.
- Every claim in a lesson links its source. Every POMWright API a lesson or exercise uses is looked up in the
  installed `index.d.ts` before the lesson is written. Every example and every exercise has been run in the workspace
  before the learner sees it. Every unit in the learner's `CURRICULUM.md` names its sources. If the `pomwright` skill
  is not installed, say so and work from the site.

## The workspace

A folder of its own, outside the user's work projects, that the user names (suggest `pomwright-learning/`). Its files
and their formats are in [references/workspace.md](references/workspace.md): the mission, the resources, the lessons,
the reference sheets, the exercises, the learning records, notes, and a copy of the practice shop.

**The first session** asks, in one message: why the user wants to learn POMWright (what they will build, by when, what
they know of Playwright and TypeScript); the way in: **getting started** (the fundamentals in one sitting), **the full
course**, or **a focused track** on one part they name; the shape of their page code (`PageObject` subclasses, an own
class over a registry, functions, or fixtures only) and which of `@step`, `SessionStorage` and the `log` fixture they
want, the defaults stated so "the defaults" is an answer; where to create the workspace; and whether you may install
`@playwright/test`, `pomwright` and TypeScript there. Then set it up:

1. Create the folder, `npm init -y`, then `npm install --save-dev @playwright/test pomwright typescript @types/node`
   and `npx playwright install chromium`.
2. Copy this skill's `assets/practice-app/` to `practice-app/`, and `assets/workspace/playwright.config.ts` and
   `assets/workspace/tsconfig.json` to the workspace root: the config starts the practice shop for every exercise run,
   and the tsconfig lets `npx tsc --noEmit` check every exercise's types first, which Playwright's runner does not.
3. Check it: `node practice-app/server.mjs` serves `http://localhost:4173`; stop it again.
4. Write `MISSION.md` and the workspace's `POMWRIGHT.md` (the `pomwright` skill's template, with the learner's shape in
   *Page code* and parts in *POMWright's parts*), place the learner, and build `CURRICULUM.md` from
   [references/curriculum.md](references/curriculum.md).

The practice shop has a header with navigation, a newsletter form and a cookie dialog on its home page, product cards,
a cart table kept in session storage, a payment form in an iframe, and a login that lands on `/account/42`: something
for every part of POMWright.

## Every session

1. **Read the state**: `MISSION.md`, `CURRICULUM.md`, the latest learning records, `NOTES.md`, the workspace's
   `POMWRIGHT.md`. Without a mission, the first session above comes first.
2. **Choose the next lesson** from `CURRICULUM.md`: what the mission needs next that the learning records show they are
   ready for, hard enough to take effort, not so far ahead that it cannot land. The user may name it instead, or ask to
   change the way in.
3. **Write the lesson** (`lessons/NNNN-slug.html`): short enough for one sitting, one skill, tied to the mission; the
   knowledge it needs and no more, each claim linked; one primary source to read; a short quiz; links to the lessons
   and reference sheets it builds on; a reminder that the learner can ask the agent anything. Build it from the shared
   stylesheet and components in the workspace's `assets/`; add a component there rather than inline code a later
   lesson would repeat. Open it for the learner when you can.
4. **Write the exercise** ([references/exercises.md](references/exercises.md)): solve it first, run it green, then
   remove the solution and give the learner the starter and the command that checks it.
5. **Give feedback** on the learner's attempt: run it, and read their code against the `pomwright` skill. A passing
   exercise written against the rules is the win; a passing one that is not gets one concrete improvement. Any
   improvement you suggest meets the `pomwright` skill's rules as the learner's code must: check it there first.
6. **Record**: a learning record when the learner showed they can do something, said what they already know, or
   corrected a misconception; the unit's status and depth in `CURRICULUM.md`; a reference sheet when a lesson produced
   something worth looking up later. Getting started ends by showing the learner `CURRICULUM.md` as their course map.

## Quizzes

Retrieval builds what lasts. Each lesson ends with a few questions the learner answers before seeing the answers:
every option of a question the same length and form, the correct one in a different position from question to
question, nothing in the formatting that gives it away. Feedback says why each answer is right or wrong, with a link.

## Review and practice

Every few lessons, or when the learner returns after a break, the next lesson is a review: questions and a small
exercise that mix the earlier topics, in a new order. When the records show the core of the mission is in place, move
the exercises from the practice shop to the learner's own app, reading it only (the `pomwright-map-site` skill maps a
site safely), and to reviewing and refactoring real tests with the `pomwright` skill's `guides/reviewing.md`.

**The learner's own project.** A focused track or a later lesson may read it, read-only. Confirm with the learner that
it is the right folder before reading. For any other folder on the machine, ask first and say plainly what reading it
shares: the files read go to the model provider as part of this conversation; nothing is written there or sent
anywhere else. Exercises stay in the workspace.

## What this skill does not do

It does not write the learner's work for them: an exercise is solved by the learner, and a lesson explains rather
than hands over finished code for their project. It does not change an exercise the learner has finished: a lesson
that needs a new structure builds it in a folder of its own, and asks before touching the learner's code. It does not
change anything outside the workspace.

## Credit

Based on Matt Pocock's [`teach`](https://github.com/mattpocock/skills) skill (MIT): its method, scoped to POMWright and
Playwright.
