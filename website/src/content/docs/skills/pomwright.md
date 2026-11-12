---
title: pomwright
description: "The core skill: an agent writes, reviews, refactors and upgrades POMWright code as these docs recommend, following your project's POMWRIGHT.md."
---

## What it does

It teaches an agent POMWright: page objects (`PageObject`, or your project's own classes, functions or fixtures over a
registry), locator paths and locator modules, fixtures and test data, navigation, session storage, the `log` fixture
and `@step`. With it the agent writes, reviews, refactors and upgrades tests and page code the way these docs
recommend, and leaves to Playwright everything Playwright owns. Exact signatures and messages come from the
declarations of the POMWright version you installed, not from the agent's memory.

## When to use it

It starts by itself whenever code imports from `pomwright`, a project has a `POMWRIGHT.md`, or you mention
POMWright. For example:

- "Write a page object for the orders page, and a test that cancels an open order."
- "Review the page objects in `tests/` and tell me what to change."
- "Upgrade this project from POMWright 2.x."

## How it works

1. **The installed versions.** It reads the versions of `pomwright` and `@playwright/test` in `node_modules`. In a 2.x
   project it says so before changing anything: the upgrade is a task of its own; and so it does for a
   `@playwright/test` outside the range POMWright supports, whose upgrade is your call.
2. **The project's `POMWRIGHT.md`.** It looks for the file beside the Playwright config and in the folders above it,
   and follows it: its decisions replace the skill's defaults. When it is missing, writing it is the first task: the
   skill asks every decision in one message, with what the project does now beside each default, and writes no code
   until you answer. It then offers a line pointing to the file in your agent instructions (`AGENTS.md`, `CLAUDE.md`).
3. **The task**, by the skill's rules and the guide for it: choosing locators and paths, writing page objects, locator
   modules, tests, fixtures and test data, the structure of a project, a review, an upgrade.

`POMWRIGHT.md` records the project's decisions: which parts of POMWright it uses (`PageObject`, a registry of its own,
`@step`, `SessionStorage`, the `log` fixture), and the skill uses no other; its apps and origins, Playwright's
`baseURL`, the layout and file names, the shape of the page code, how paths are named, where checks live, test data, and
the model and effort to use for which task. The skill's default names a path segment by what the element does and which
one in a user's words (`main.form@login.button@login`), plural for several (`main.table@orders.rows`), a region a
`section` whatever it looks like; a project that names them another way records its own convention, and the skill
follows it. The defaults are in the skill's
[template](https://github.com/DyHex/POMWright/blob/main/skills/pomwright/assets/templates/POMWRIGHT.md).

## What we measured

23 tasks a tester does with POMWright on a small practice shop (page objects and tests, a flaky test, seeded session
storage, an upgrade from 2.x, a review, a new project), 3 runs each with the skill and without it, Claude Opus 5.5 at
effort high. A run counts as correct when its tests pass, the code checks find nothing, and an AI judge, whose every
finding we checked against the code, finds the task done to the rubric.

| | with the skill | without |
| --- | --- | --- |
| runs correct | 69 of 69 | 49 of 69 |
| mistakes a reviewer would flag, per run | 0.2 | 0.5 |
| code compiles and its tests pass | 51 of 51 | 51 of 51 |
| time and cost per run | 59 s, $0.49 | 65 s, $0.50 |

- **Where it matters most**: it asks the open decisions before writing code (9 of 9 runs; without it, none of 9), keeps
  the parts every page has in one place, fixes a flaky test in the page object rather than in the one spec, and finds
  the planted problems in a review (8 of 9 across Haiku, Sonnet and Opus, against none of 9 without).
- **Cost**: a few cents more on the smallest tasks, where loading the skill is a larger share; 19 to 31% cheaper and
  18 to 38% faster on the larger ones. After later changes, a recheck of 8 tasks counted 24 of 24 runs correct and 0.08
  mistakes a run.
- **Larger tasks**, such as refactoring a whole test project, were not measured. The gains are consistency (structure,
  names, reuse, asking first), which a larger task has more chances to lose, and the saving grew with the task's size.
- **Limits**: a small, predictable practice app; one model at one effort; 3 runs a task. The runs without the skill had
  the project's code and `POMWRIGHT.md` to follow, which helps them.

Run it as the [index](/POMWright/skills/#using-them-well) recommends.

## Install and source

Install it as the [index](/POMWright/skills/#install) shows. Source:
[`skills/pomwright`](https://github.com/DyHex/POMWright/tree/main/skills/pomwright).
