---
title: Agent skills
description: "Skills that teach a coding agent to write, map and teach POMWright code, and to review any project: what each does, and how to install them."
---

An agent skill is a folder of instructions that a coding agent loads when a task calls for it, in the
[Agent Skills](https://agentskills.io/) format that Claude Code, Codex and other agents read. POMWright's skills teach
an agent to work with POMWright as these docs recommend, and to read exact signatures from the version your project
installed. They live in the repository's [`skills/`](https://github.com/DyHex/POMWright/tree/main/skills) folder and
are not part of the `pomwright` package.

## The skills

| skill | starts | what it does |
| --- | --- | --- |
| [`pomwright`](/POMWright/skills/pomwright/) | by itself, when code uses POMWright or you mention it | writes, reviews, refactors and upgrades tests, page code, locator modules, fixtures and test data |
| [`pomwright-map-site`](/POMWright/skills/pomwright-map-site/) | when you ask for page objects for a running site | maps the pages you pick and generates their page code and a starter test that checks every path |
| [`pomwright-teach`](/POMWright/skills/pomwright-teach/) | only when you run it | teaches POMWright over several sessions, with lessons, quizzes and exercises |

`pomwright-map-site` and `pomwright-teach` build on `pomwright`: install it with them.

## Other skills

| skill | starts | what it does |
| --- | --- | --- |
| [`defect-review`](/POMWright/skills/defect-review/) | only when you run it | an evidence-based defect review of any kind of system, not only POMWright projects |

## Install

With the [skills CLI](https://github.com/vercel-labs/skills) (Node 22.20 or later), from your project's root:

```bash
npx skills add DyHex/POMWright
```

It lists the skills to pick and the agents it found. To install chosen skills for chosen agents without the prompts,
name them: `npx skills add DyHex/POMWright --skill pomwright pomwright-map-site --agent claude-code codex`. `--skill '*'`
installs every skill, and `-g` installs for every project of your user.

Or copy a skill's folder yourself:

| agent | for one project | for every project |
| --- | --- | --- |
| Claude Code | `.claude/skills/<skill>/` | `~/.claude/skills/<skill>/` |
| Codex | `.agents/skills/<skill>/` | `~/.agents/skills/<skill>/` |

A skill that starts only when you run it is run as `/<skill>` in Claude Code and `$<skill>` in Codex.

## Requirements

The POMWright skills need POMWright 3.x, `@playwright/test` 1.64 or later and Node 20 or later. They read the
installed POMWright version first, and send a 2.x project to its upgrade. They were evaluated with Claude Opus at effort
high, which is the effort to run them at.

## `POMWRIGHT.md`

`pomwright` keeps a project's choices in `POMWRIGHT.md`, beside the Playwright config: the shape of the page code,
origins and `baseURL`, how paths are named, test data, and the rest of what POMWright leaves open. When the file is
missing, the skill asks you every decision in one message and writes the file before any other work, so every agent
and person follows the same decisions. See [`pomwright`](/POMWright/skills/pomwright/#how-it-works).

## How they are kept true

Every TypeScript example in a skill compiles against the packed package, every locator chain a skill shows is rebuilt
by a test, and every link to these docs names a page that exists; CI runs these checks. A change to POMWright updates
the skills that describe it in the same change. Before a release of the skills, agents work through a set of tasks
with and without them.
