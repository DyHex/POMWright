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

1. **The installed version.** It reads the version in `node_modules/pomwright/package.json`. In a 2.x project it says
   so before changing anything: the upgrade is a task of its own.
2. **The project's `POMWRIGHT.md`.** It looks for the file beside the Playwright config and in the folders above it,
   and follows it: its decisions replace the skill's defaults. When it is missing, writing it is the first task: the
   skill asks every decision in one message, with what the project does now beside each default, and writes no code
   until you answer. It then offers a line pointing to the file in your agent instructions (`AGENTS.md`, `CLAUDE.md`).
3. **The task**, by the skill's rules and the guide for it: choosing locators and paths, writing page objects, locator
   modules, tests, fixtures and test data, the structure of a project, a review, an upgrade.

`POMWRIGHT.md` records the project's decisions: which parts of POMWright it uses (`PageObject`, a registry of its own,
`@step`, `SessionStorage`, the `log` fixture), and the skill uses no other; its apps and origins, Playwright's
`baseURL`, the layout and file names, the shape of the page code, how paths are named, where checks live, test data, and the model and effort to use
for which task. The skill's default names a path segment by what the element does and which one in a user's words
(`main.form@login.button@login`), plural for several (`main.table@orders.rows`); a project that names them another way
records its own convention, and the skill follows it. The defaults are in the skill's
[template](https://github.com/DyHex/POMWright/blob/main/skills/pomwright/assets/templates/POMWRIGHT.md).

## Install and source

Install it as the [index](/POMWright/skills/#install) shows. Source:
[`skills/pomwright`](https://github.com/DyHex/POMWright/tree/main/skills/pomwright).
