# Agent skills

Skills for coding agents (Claude Code, Codex and other agents that read the [Agent Skills](https://agentskills.io/)
format) that work with POMWright and Playwright. Each is a folder with a `SKILL.md` the agent loads when the skill
applies, and the files it reads as it needs them. The documentation site's
[Skills section](https://dyhex.github.io/POMWright/skills/) has a page per skill: what it does, when to use it and how
it works.

## The skills

| skill | starts | what it does |
| --- | --- | --- |
| [pomwright](pomwright/SKILL.md) | by itself, when code uses POMWright or the user mentions it | writes, reviews, refactors and upgrades tests, page code (`PageObject`, or the project's own classes, functions or fixtures), locator modules, fixtures and test data the way the POMWright docs recommend; says what POMWright adds to Playwright and leaves the rest to Playwright; reads exact signatures from your installed POMWright |
| [pomwright-map-site](pomwright-map-site/SKILL.md) | when you ask it to generate page objects from a running site | crawls the origin you name, you pick the pages, it reads each page's accessibility snapshot, DOM and a screenshot and generates the base class, locator modules, page objects, fixtures and a starter spec that checks every path against the live page; it only reads, reveals only what you confirm, and opens pages only on the origins you name |
| [pomwright-teach](pomwright-teach/SKILL.md) | only when you run it: `/pomwright-teach` in Claude Code, `$pomwright-teach` in Codex | teaches POMWright in a learning workspace: getting started in one sitting, the full course, or a focused track on one part, in the learner's shape of page code; short lessons with quizzes and exercises against a practice shop it provides, progress kept in files |
| [defect-review](defect-review/SKILL.md) | only when you run it: `/defect-review` in Claude Code, `$defect-review` in Codex | an evidence-based defect review of any kind of system (a library, a service, an app, a CLI, a pipeline, infrastructure code), of a whole project, a change set or one area: it writes a profile of the system first, reproduces every finding before reporting it, and changes nothing; not specific to POMWright |

`pomwright-map-site` and `pomwright-teach` build on `pomwright`: install it with them.

`pomwright` keeps a project's choices in `POMWRIGHT.md`, beside the Playwright config: which parts of POMWright it
uses (and the skill uses no other), the shape of the page code, origins and `baseURL`, path names, test data, the model
and effort recommended for which task, and the rest of what POMWright leaves open. When the file is missing, the skill
asks you each decision and writes it before any other work, so every agent and person follows the same decisions and
nobody is asked twice.

## Requirements

POMWright 3.x, `@playwright/test` 1.64 or later, Node 20 or later. The skills read the installed versions of both
first: a 2.x project goes to its upgrade, and a `@playwright/test` outside POMWright's range is pointed out before
anything changes.

## Install

With the [skills CLI](https://github.com/vercel-labs/skills) (Node 22.20 or later), from your project's root:

```sh
npx skills add DyHex/POMWright
```

It lists the skills to pick and the agents it found. To install every skill for chosen agents without the prompts:
`npx skills add DyHex/POMWright --skill '*' --agent claude-code codex`; add `-g` to install for every project of your
user.

Or copy the folders yourself:

| agent | for one project | for every project |
| --- | --- | --- |
| Claude Code | `.claude/skills/<skill>/` | `~/.claude/skills/<skill>/` |
| Codex | `.agents/skills/<skill>/` | `~/.agents/skills/<skill>/` |

## How they are kept true

Every TypeScript example in a skill compiles against the packed package, every locator chain a skill shows is rebuilt
by a test, and every link to the documentation names a page and heading that exist; the repository's CI runs these checks. A
change to POMWright updates the skills that describe it in the same change.

`pomwright-teach` follows the method of Matt Pocock's [`teach`](https://github.com/mattpocock/skills) skill (MIT).
