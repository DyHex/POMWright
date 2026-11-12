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
| [`pomwright-teach`](/POMWright/skills/pomwright-teach/) | only when you run it | teaches POMWright: getting started in one sitting, the full course, or one part, with lessons, quizzes and exercises |

`pomwright-map-site` and `pomwright-teach` build on `pomwright`: install it with them.

## Other skills

| skill | starts | what it does |
| --- | --- | --- |
| [`defect-review`](/POMWright/skills/defect-review/) | only when you run it | an evidence-based defect review of any kind of system, not only POMWright projects |

## What was measured

Each skill was measured before its first release; its page has the details.

<div class="measured">

| skill | with the skill | without |
| --- | --- | --- |
| [`pomwright`](/POMWright/skills/pomwright/#what-was-measured) | **99%** of runs fully correct, **0.03** mistakes per run, the open decisions asked first **every time** | 72%, 0.29, never |
| [`pomwright-map-site`](/POMWright/skills/pomwright-map-site/#what-was-measured) | **36% cheaper, 35% faster**, no singular path that matches several | 26 such paths |
| [`pomwright-teach`](/POMWright/skills/pomwright-teach/#what-was-measured) | three learners, from new to Playwright to knowing POMWright, through getting started, **every exercise passing** | |
| [`defect-review`](/POMWright/skills/defect-review/#what-was-measured) | **7 of 8** known defects reported with a reproduction | 3 of 8 |

</div>

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
installed versions of both first: a 2.x project goes to its upgrade, and a `@playwright/test` outside POMWright's range
is pointed out before anything changes.

## Using them well

- **Run them at effort high.** The evaluations ran Claude Opus 5.5, the POMWright skills at effort high. The effort
  test, one small task without tools, on Claude Opus 5.5:

  | effort | time | output tokens | answer |
  | --- | --- | --- | --- |
  | high | **4 s** | **412** | right |
  | xhigh | 5 s | 439 | right |
  | low | 14 min | 128,634 ($3.28) | right |
  | the default | 13.5 min | 128,726 ($3.31) | right |
  | medium | | | none in three tries |

- **Review what they write.** The skills make mistakes, far fewer than an agent without them: in the latest
  evaluation, `pomwright` made 2 in 72 runs, against 21 without it (a test title that claims more than its check, a
  count read once and checked as a number). Read an agent's code as you would a colleague's.
- **Disagree in `POMWRIGHT.md`.** Where you would do something another way than the skill's default (the names of
  paths, the shape of page code, where checks live), record it in your `POMWRIGHT.md`: its decisions replace the
  defaults, for every agent and person on the project.
- **Feedback.** A mistake the skills keep making, or a default that does not fit: open an
  [issue](https://github.com/DyHex/POMWright/issues).

## `POMWRIGHT.md`

`pomwright` keeps a project's choices in `POMWRIGHT.md`, beside the Playwright config: which parts of POMWright it
uses, the shape of the page code, origins and `baseURL`, how paths are named, test data, and the rest of what POMWright
leaves open. When the file is missing, the skill asks you every decision in one message and writes the file before
any other work, so every agent and person follows the same decisions. See
[`pomwright`](/POMWright/skills/pomwright/#how-it-works).

## How they are kept true

Every TypeScript example in a skill compiles against the packed package, every locator chain a skill shows is rebuilt
by a test, and every link to these docs names a page and heading that exist; CI runs these checks on every pull
request. The contributor guide has a change to POMWright update the skills that describe it in the same change, and
these checks fail when an example, a chain or a link no longer holds. Before their first release, each skill was measured:
`pomwright` and `pomwright-map-site` against an agent without them, each run in a fresh workspace with the web and no
access to this repository; `pomwright-teach` through three courses; `defect-review` with and without it. Each skill's
page says what was measured.
