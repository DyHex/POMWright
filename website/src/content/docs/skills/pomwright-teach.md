---
title: pomwright-teach
description: "An agent teaches you POMWright with Playwright over several sessions: lessons, quizzes and runnable exercises against a practice shop."
---

## What it does

It teaches POMWright with Playwright as a course over several sessions, in a learning workspace of its own: short
lessons grounded in these docs and Playwright's, quizzes, and exercises you run against a practice shop the skill
provides. Your progress is kept in files, so each session continues where the last one ended.

## When to use it

It starts only when you run it: `/pomwright-teach` in Claude Code, `$pomwright-teach` in Codex, with what you would like
to learn, for example "page objects with locator paths, for our checkout tests".

## How it works

1. **The workspace.** The first session asks where to create it (outside your work projects), and asks before
   installing `@playwright/test` and `pomwright` there. It copies in the practice shop: a header, a newsletter form, a
   cookie dialog, product cards, a cart kept in session storage, a payment form in an iframe and a login.
2. **Your mission.** It asks why you want to learn POMWright, what you will build, and what you know of Playwright and
   TypeScript, and writes that down.
3. **Every session** reads your mission and records, picks the next lesson (or the one you name), writes it with a
   short quiz and links to its sources, and ends with an exercise that you run and see pass.

Every claim in a lesson links its source, and every example and exercise has been run in the workspace first.

## Install and source

Install it with `pomwright`, as the [index](/POMWright/skills/#install) shows. Source:
[`skills/pomwright-teach`](https://github.com/DyHex/POMWright/tree/main/skills/pomwright-teach).
